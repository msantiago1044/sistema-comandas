-- ============================================================
-- SISTEMA DE COMANDAS MULTI-RESTAURANTE
-- Esquema SQL para Supabase + Políticas RLS
-- ============================================================

-- Extensión para generación de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLA: salas
-- Representa una sesión de servicio (un turno/noche)
-- ============================================================
CREATE TABLE IF NOT EXISTS salas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin         CHAR(4) NOT NULL UNIQUE,
  nombre      TEXT NOT NULL DEFAULT 'Sala',
  num_mesas   INT NOT NULL DEFAULT 10 CHECK (num_mesas BETWEEN 1 AND 100),
  activa      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cerrada_at  TIMESTAMPTZ
);

-- Índice para búsqueda rápida por PIN
CREATE INDEX IF NOT EXISTS idx_salas_pin ON salas (pin) WHERE activa = true;

-- ============================================================
-- TABLA: meseros
-- Participantes conectados a una sala (sin cuenta permanente)
-- ============================================================
CREATE TABLE IF NOT EXISTS meseros (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id     UUID NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meseros_sala ON meseros (sala_id);

-- ============================================================
-- TABLA: comandas
-- El corazón del sistema — máquina de estados
-- Estados: pendiente → listo → por_cobrar → pagado
-- ============================================================
CREATE TABLE IF NOT EXISTS comandas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id     UUID NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
  mesero_id   UUID NOT NULL REFERENCES meseros(id),
  serial      CHAR(5) NOT NULL,              -- Ej: #K9X2 (sin #, se añade en UI)
  mesa        INT NOT NULL,
  detalle     TEXT NOT NULL,
  estado      TEXT NOT NULL DEFAULT 'pendiente'
              CHECK (estado IN ('pendiente','listo','por_cobrar','pagado')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  listo_at    TIMESTAMPTZ,
  cobrado_at  TIMESTAMPTZ,
  UNIQUE (sala_id, serial)                   -- Serial único por sala
);

CREATE INDEX IF NOT EXISTS idx_comandas_sala_estado ON comandas (sala_id, estado);
CREATE INDEX IF NOT EXISTS idx_comandas_mesero ON comandas (mesero_id);

-- ============================================================
-- FUNCIÓN: generar serial alfanumérico único por sala
-- Formato: 4 chars aleatorios de [A-Z0-9] excluyendo confusos
-- ============================================================
CREATE OR REPLACE FUNCTION generar_serial(p_sala_id UUID)
RETURNS CHAR(5) AS $$
DECLARE
  charset  TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sin O,0,I,1
  nuevo    CHAR(5);
  intentos INT := 0;
BEGIN
  LOOP
    nuevo := '';
    FOR i IN 1..4 LOOP
      nuevo := nuevo || substr(charset, floor(random() * length(charset) + 1)::INT, 1);
    END LOOP;
    -- Verifica unicidad dentro de la sala (solo comandas activas)
    IF NOT EXISTS (
      SELECT 1 FROM comandas
      WHERE sala_id = p_sala_id AND serial = nuevo
        AND estado NOT IN ('pagado')
    ) THEN
      RETURN nuevo;
    END IF;
    intentos := intentos + 1;
    IF intentos > 100 THEN
      RAISE EXCEPTION 'No se pudo generar serial único tras 100 intentos';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCIÓN: crear sala con PIN único
-- ============================================================
CREATE OR REPLACE FUNCTION crear_sala(
  p_nombre    TEXT,
  p_mesas     INT
) RETURNS salas AS $$
DECLARE
  nuevo_pin   CHAR(4);
  nueva_sala  salas;
  intentos    INT := 0;
BEGIN
  LOOP
    nuevo_pin := LPAD(floor(random() * 10000)::TEXT, 4, '0');
    IF NOT EXISTS (SELECT 1 FROM salas WHERE pin = nuevo_pin AND activa = true) THEN
      EXIT;
    END IF;
    intentos := intentos + 1;
    IF intentos > 1000 THEN RAISE EXCEPTION 'No se pudo generar PIN único'; END IF;
  END LOOP;

  INSERT INTO salas (nombre, pin, num_mesas)
  VALUES (p_nombre, nuevo_pin, p_mesas)
  RETURNING * INTO nueva_sala;

  RETURN nueva_sala;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCIÓN: insertar comanda con serial auto-generado
-- ============================================================
CREATE OR REPLACE FUNCTION nueva_comanda(
  p_sala_id   UUID,
  p_mesero_id UUID,
  p_mesa      INT,
  p_detalle   TEXT
) RETURNS comandas AS $$
DECLARE
  s CHAR(5);
  c comandas;
BEGIN
  -- Verifica que la mesa esté en rango
  IF p_mesa < 1 OR p_mesa > (SELECT num_mesas FROM salas WHERE id = p_sala_id) THEN
    RAISE EXCEPTION 'Mesa fuera de rango';
  END IF;

  s := generar_serial(p_sala_id);

  INSERT INTO comandas (sala_id, mesero_id, serial, mesa, detalle)
  VALUES (p_sala_id, p_mesero_id, s, p_mesa, p_detalle)
  RETURNING * INTO c;

  RETURN c;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- POLÍTICAS RLS — Row Level Security
-- Aísla los datos de cada sala por su PIN
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE salas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE meseros  ENABLE ROW LEVEL SECURITY;
ALTER TABLE comandas ENABLE ROW LEVEL SECURITY;

-- NOTA: Para el MVP usamos anon key con políticas permisivas controladas
-- por la lógica de aplicación. En producción, usar JWT claims para sala_id.

-- Política de salas: cualquiera puede leer salas activas (para validar PIN)
CREATE POLICY "salas_select_activas" ON salas
  FOR SELECT USING (activa = true);

-- Política de salas: inserción solo via función crear_sala (SECURITY DEFINER)
CREATE POLICY "salas_insert_func" ON salas
  FOR INSERT WITH CHECK (false); -- Bloqueado; usar función

-- Política de meseros: lectura y escritura solo en salas activas
CREATE POLICY "meseros_select" ON meseros
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM salas WHERE id = sala_id AND activa = true)
  );

CREATE POLICY "meseros_insert" ON meseros
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM salas WHERE id = sala_id AND activa = true)
  );

CREATE POLICY "meseros_update_own" ON meseros
  FOR UPDATE USING (true);

-- Política de comandas: solo dentro de salas activas
CREATE POLICY "comandas_select" ON comandas
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM salas WHERE id = sala_id AND activa = true)
  );

CREATE POLICY "comandas_insert" ON comandas
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM salas WHERE id = sala_id AND activa = true)
  );

CREATE POLICY "comandas_update" ON comandas
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM salas WHERE id = sala_id AND activa = true)
  );

-- ============================================================
-- REALTIME: Habilitar publicaciones en tiempo real
-- ============================================================
-- Ejecutar en el Dashboard de Supabase > Database > Replication
-- O via SQL:

ALTER PUBLICATION supabase_realtime ADD TABLE comandas;
ALTER PUBLICATION supabase_realtime ADD TABLE meseros;

-- ============================================================
-- ÍNDICES ADICIONALES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_comandas_activas ON comandas (sala_id)
  WHERE estado NOT IN ('pagado');

CREATE INDEX IF NOT EXISTS idx_comandas_mesero_activas ON comandas (mesero_id)
  WHERE estado NOT IN ('pagado');
