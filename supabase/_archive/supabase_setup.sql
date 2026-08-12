-- Migration: Setup missing tables and populate initial data

-- 0. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL UNIQUE,
    full_name TEXT,
    email TEXT,
    current_phase TEXT,
    cycle_length INTEGER DEFAULT 28,
    period_length INTEGER DEFAULT 5,
    last_period_start DATE,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid()::text = clerk_user_id OR clerk_user_id = (auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid()::text = clerk_user_id OR clerk_user_id = (auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "Anyone can insert a profile" ON public.profiles;
CREATE POLICY "Anyone can insert a profile" ON public.profiles
    FOR INSERT WITH CHECK (true);

-- 1. Create Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'free', -- 'free', 'premium', 'pro'
    plan_id TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for subscriptions
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid()::text = clerk_user_id OR clerk_user_id = (auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
    FOR ALL USING (true);


-- 2. Ensure Articles Table exists and has unique title
CREATE TABLE IF NOT EXISTS public.articles (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    image_url TEXT,
    read_time TEXT,
    tag TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure title is unique even if table existed
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'articles_title_key') THEN
        ALTER TABLE public.articles ADD CONSTRAINT articles_title_key UNIQUE (title);
    END IF;
END $$;

-- Enable RLS for articles
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read articles" ON public.articles;
CREATE POLICY "Anyone can read articles" ON public.articles FOR SELECT USING (true);


-- 3. Populate Recipes
-- Ensure title is unique for recipes
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recipes_title_key') THEN
        ALTER TABLE public.recipes ADD CONSTRAINT recipes_title_key UNIQUE (title);
    END IF;
END $$;

-- Clean up existing test recipes if desired, or just use ON CONFLICT
INSERT INTO public.recipes (title, calories, time_minutes, category, phase_key, nutritional_insight, image_url, ingredients, instructions)
VALUES 
('Bowl de Quinoa y Espinaca', 420, 25, 'Fase Menstrual', 'menstrual', 'El hierro de las espinacas y la quinoa ayuda a reponer tus niveles de energia naturales durante estos dias de renovacion.', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800', ARRAY['1 taza de quinoa cocida', '2 tazas de espinaca baby', '1/2 aguacate en rebanadas', '1/4 taza de garbanzos', 'Semillas de sesamo', 'Aderezo de limon y tahini'], ARRAY['Lava y cocina la quinoa segun las instrucciones del paquete.', 'En un bowl, coloca una base de espinacas frescas.', 'Agrega la quinoa, el aguacate y los garbanzos.', 'Espolvorea semillas de sesamo por encima.', 'Bana con el aderezo de tahini antes de servir.']),
('Ensalada de pollo con quinoa tostada', 320, 15, 'Fase Folicular', 'follicular', 'La proteina del pollo y los aminoacidos de la quinoa te daran la energia sostenida ideal para esta etapa ascendente de tu ciclo.', 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=800', ARRAY['1 pechuga de pollo asada en trozos', '1/2 taza de quinoa tostada', '2 tazas de espinaca fresca o kale', '1/2 aguacate rebanado', 'Tomates cherry al gusto', 'Aderezo ligero de limon y aceite de oliva'], ARRAY['Tuesta la quinoa en una sarten a fuego medio hasta que este dorada.', 'En un bowl amplio, mezcla la espinaca, el pollo, el tomate y el aguacate.', 'Agrega la quinoa tostada encima para un toque crujiente.', 'Bana con el aderezo ligero justo antes de comer para mantener la frescura.']),
('Salmon con Esparragos y Limon', 540, 30, 'Fase Ovulacion', 'ovulation', 'El Omega-3 y el zinc del salmon son aliados clave para potenciar tu fertilidad y luminosidad natural en esta fase.', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800', ARRAY['200g de filete de salmon fresco', '1 manojo de esparragos tiernos', '2 cucharadas de aceite de oliva', 'Rodajas de limon amarillo', 'Sal de mar y pimienta negra'], ARRAY['Precalienta el horno a 200C.', 'Coloca el salmon y los esparragos en una bandeja para hornear.', 'Rocia con aceite de oliva y sazona con sal y mucha pimienta.', 'Coloca las rodajas de limon sobre el salmon.', 'Hornea durante 12-15 minutos hasta que el salmon este cocido.']),
('Poke bowl de arroz con atun, mango y aguacate', 450, 20, 'Fase Lutea', 'luteal', 'Las grasas saludables del aguacate y el atun, junto a la energia del arroz, promueven saciedad y balancean tus emociones antes de tu periodo.', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800', ARRAY['1 taza de arroz de sushi o integral', '150g de atun fresco en cubos', '1/2 mango maduro en cubos', '1/2 aguacate en rebanadas', 'Edamames al gusto', 'Salsa ponzu o soya baja en sodio', 'Semillas de sesamo para decorar'], ARRAY['Cocina el arroz de acuerdo a las instrucciones y colocarlo como base en tu bowl.', 'Acomoda armonicamente el atun, mango, aguacate y edamames sobre el arroz.', 'Vierte la salsa elegida de manera uniforme.', 'Decora con semillas de sesamo y disfruta frio.']),
('Curry suave de garbanzos y coco', 470, 30, 'Fase Lutea', 'luteal', 'Los carbohidratos reconfortantes y los garbanzos ayudan con los antojos de la fase lutea.', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800', ARRAY['1 taza de garbanzos cocidos', '1 taza de leche de coco', '1 cebolla pequena', '1 diente de ajo', '1 cucharadita de curry suave', '1 taza de arroz integral cocido', 'Cilantro'], ARRAY['Sofrie la cebolla y el ajo.', 'Anade el curry y los garbanzos.', 'Vierte la leche de coco y cocina 10 minutos.', 'Sirve sobre arroz integral y decora con cilantro.'])
ON CONFLICT (title) DO NOTHING;


-- 4. Populate Articles
INSERT INTO public.articles (title, excerpt, image_url, read_time, tag)
VALUES 
('Nutrición en la Fase Menstrual', 'Consigue el alivio que necesitas con alimentos ricos en hierro y magnesio...', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800', '5 min lectura', 'NUTRICIÓN'),
('Yoga para el Alivio de Calambres', 'Posturas suaves diseñadas para reducir la inflamación y el dolor...', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800', '8 min lectura', 'BIENESTAR'),
('Bio-Sincronización Avanzada', 'Cómo optimizar tu productividad semanal según tus niveles hormonales...', 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800', '10 min lectura', 'ESTILO DE VIDA')
ON CONFLICT (title) DO NOTHING;


-- 5. Daily Logs Table Setup
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id BIGSERIAL PRIMARY KEY,
    clerk_user_id TEXT NOT NULL,
    mood TEXT,
    symptoms JSONB DEFAULT '[]',
    notes TEXT,
    cycle_day INTEGER,
    phase_key TEXT,
    logged_at TIMESTAMPTZ DEFAULT now(),
    log_date DATE NOT NULL,
    UNIQUE(clerk_user_id, log_date)
);

-- Ensure daily_logs has the unique constraint for upserts
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_logs_user_date_key') THEN
        ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_user_date_key UNIQUE (clerk_user_id, log_date);
    END IF;
END $$;

-- Enable RLS for daily_logs
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own logs" ON public.daily_logs;
CREATE POLICY "Users can manage their own logs" ON public.daily_logs
    FOR ALL USING (auth.uid()::text = clerk_user_id OR clerk_user_id = (auth.jwt() ->> 'sub'));


-- 6. Sample Logs (OPTIONAL)
-- If you want to see data immediately, run this with your actual Clerk ID:
-- INSERT INTO public.daily_logs (clerk_user_id, mood, symptoms, notes, cycle_day, phase_key, log_date)
-- VALUES ('REPLACE_WITH_YOUR_CLERK_ID', 'energetic', '["none"]', 'Feeling great!', 8, 'follicular', CURRENT_DATE)
-- ON CONFLICT DO NOTHING;
