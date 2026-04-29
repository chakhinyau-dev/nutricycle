alter table public.profiles
add column if not exists is_premium boolean not null default false;

insert into public.recipes (
  id,
  title,
  category,
  phase_key,
  phase_label,
  calories,
  time_minutes,
  nutritional_insight,
  image_url,
  ingredients,
  instructions
)
values
  (
    5,
    'Avena cremosa con cacao y nuez',
    'Fase Menstrual',
    'menstrual',
    'Menstrual',
    380,
    12,
    'Warm oats, cacao, and walnuts support iron intake and comfort during the menstrual phase.',
    'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=800',
    '["1 taza de avena","2 tazas de leche o bebida vegetal","1 cucharada de cacao puro","1 cucharada de nuez picada","Canela al gusto","1 cucharadita de miel opcional"]'::jsonb,
    '["Calienta la leche en una olla pequena.","Agrega la avena, el cacao y la canela.","Cocina a fuego bajo hasta que espese.","Sirve con nuez picada y miel si deseas."]'::jsonb
  ),
  (
    6,
    'Crema de calabaza con jengibre y lentejas',
    'Fase Menstrual',
    'menstrual',
    'Menstrual',
    360,
    28,
    'This soup brings iron, fiber, and gentle warmth for low-energy days.',
    'https://images.unsplash.com/photo-1547592180-85f173990554?w=800',
    '["2 tazas de calabaza en cubos","1 taza de lentejas cocidas","1 trozo pequeno de jengibre","1 cebolla pequena","1 cucharada de aceite de oliva","Caldo de verduras","Sal y pimienta"]'::jsonb,
    '["Sofrie la cebolla y el jengibre.","Agrega la calabaza y el caldo.","Cocina hasta que la calabaza ablande.","Anade las lentejas y licua hasta obtener una crema suave."]'::jsonb
  ),
  (
    7,
    'Tacos de pavo con col morada y pico de gallo',
    'Fase Folicular',
    'follicular',
    'Folicular',
    410,
    20,
    'Lean protein and crisp vegetables support the rising energy of the follicular phase.',
    'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=800',
    '["250g de pavo molido","6 tortillas de maiz","1 taza de col morada rallada","1 tomate picado","1/4 de cebolla morada","Cilantro","Limon","Sal y comino"]'::jsonb,
    '["Cocina el pavo con sal y comino.","Prepara el pico de gallo con tomate, cebolla y cilantro.","Calienta las tortillas.","Arma los tacos con col morada y termina con limon."]'::jsonb
  ),
  (
    8,
    'Yogur griego con frutos rojos y semillas',
    'Fase Folicular',
    'follicular',
    'Folicular',
    290,
    8,
    'Protein-rich yogurt and berries make this an easy follicular-phase breakfast or snack.',
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',
    '["1 taza de yogur griego natural","1/2 taza de frutos rojos","1 cucharada de semillas de chía","1 cucharada de granola","Miel opcional"]'::jsonb,
    '["Sirve el yogur en un bowl.","Anade frutos rojos y semillas.","Corona con granola y un hilo de miel si lo deseas."]'::jsonb
  ),
  (
    9,
    'Tostadas de hummus con huevo y rucula',
    'Fase Ovulacion',
    'ovulation',
    'Ovulacion',
    430,
    15,
    'Eggs, greens, and chickpeas offer a balanced ovulation-phase meal with protein and antioxidants.',
    'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=800',
    '["2 rebanadas de pan integral","1/2 taza de hummus","2 huevos","1 taza de rucula","Aceite de oliva","Sal, pimienta y paprika"]'::jsonb,
    '["Tuesta el pan hasta que quede crujiente.","Unta una capa generosa de hummus.","Coloca el huevo cocido o a la plancha encima.","Agrega rucula y termina con aceite de oliva."]'::jsonb
  ),
  (
    10,
    'Ensalada de camote, naranja y pepitas',
    'Fase Ovulacion',
    'ovulation',
    'Ovulacion',
    390,
    18,
    'Vitamin C from orange and minerals from pepitas make this a colorful ovulation bowl.',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    '["1 camote mediano asado","1 naranja en gajos","2 tazas de espinaca","2 cucharadas de pepitas","Queso feta opcional","Aderezo de aceite de oliva y limon"]'::jsonb,
    '["Asa el camote hasta que quede tierno.","Mezcla espinaca, naranja y camote.","Agrega pepitas y queso feta si deseas.","Aliña con aceite de oliva y limon."]'::jsonb
  ),
  (
    11,
    'Curry suave de garbanzos y coco',
    'Fase Lutea',
    'luteal',
    'Lutea',
    470,
    30,
    'Comforting carbs and magnesium-rich chickpeas can help with luteal-phase cravings.',
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800',
    '["1 taza de garbanzos cocidos","1 taza de leche de coco","1 cebolla pequena","1 diente de ajo","1 cucharadita de curry suave","1 taza de arroz integral cocido","Cilantro"]'::jsonb,
    '["Sofrie la cebolla y el ajo.","Anade el curry y los garbanzos.","Vierte la leche de coco y cocina 10 minutos.","Sirve sobre arroz integral y decora con cilantro."]'::jsonb
  ),
  (
    12,
    'Pasta integral con sardinas y espinacas',
    'Fase Lutea',
    'luteal',
    'Lutea',
    520,
    22,
    'Omega-3, fiber, and satisfying pasta help support luteal-phase hunger and energy.',
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800',
    '["200g de pasta integral","1 lata de sardinas en aceite de oliva","2 tazas de espinaca","1 diente de ajo","Limon","Pimienta negra"]'::jsonb,
    '["Cocina la pasta al dente.","Saltea el ajo con la espinaca.","Agrega las sardinas y un poco de limon.","Mezcla con la pasta y termina con pimienta."]'::jsonb
  )
on conflict (id) do update
set
  title = excluded.title,
  category = excluded.category,
  phase_key = excluded.phase_key,
  phase_label = excluded.phase_label,
  calories = excluded.calories,
  time_minutes = excluded.time_minutes,
  nutritional_insight = excluded.nutritional_insight,
  image_url = excluded.image_url,
  ingredients = excluded.ingredients,
  instructions = excluded.instructions;

select setval(
  pg_get_serial_sequence('public.recipes', 'id'),
  coalesce((select max(id) from public.recipes), 1),
  true
);
