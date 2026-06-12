export const MOCK_RECIPES = [
  {
    id: '1',
    title: 'Bowl de Quinoa y Espinaca',
    calories: 420,
    time: 25,
    category: 'Fase Menstrual',
    phaseKey: 'menstrual',
    mealType: 'lunch',
    goals: ['acne', 'periods', 'digestion'],
    nutritionalInsight:
      'El hierro de las espinacas y la quinoa ayuda a reponer tus niveles de energia naturales durante estos dias de renovacion.',
    image: { uri: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800' },
    ingredients: [
      '1 taza de quinoa cocida',
      '2 tazas de espinaca baby',
      '1/2 aguacate en rebanadas',
      '1/4 taza de garbanzos',
      'Semillas de sesamo',
      'Aderezo de limon y tahini',
    ],
    structuredIngredients: [
      { name: 'Quinoa cocida', quantity: 1, unit: 'taza', category: 'Grains' },
      { name: 'Espinaca baby', quantity: 2, unit: 'tazas', category: 'Vegetables' },
      { name: 'Aguacate', quantity: 0.5, unit: 'unidad', category: 'Fruits' },
      { name: 'Garbanzos', quantity: 0.25, unit: 'taza', category: 'Proteins' },
      { name: 'Semillas de sésamo', quantity: 1, unit: 'cucharada', category: 'Pantry' },
      { name: 'Limón y tahini', quantity: 1, unit: 'aderezo', category: 'Pantry' }
    ],
    keyIngredients: [
      { name: 'Espinaca baby', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=150', note: 'Aporta hierro esencial para reponer las pérdidas durante la menstruación.' },
      { name: 'Quinoa', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150', note: 'Proteína completa y carbohidratos complejos de absorción lenta para energía estable.' },
      { name: 'Aguacate', image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=150', note: 'Grasas saludables que apoyan la síntesis de hormonas y reducen inflamación.' }
    ],
    instructions: [
      'Lava y cocina la quinoa segun las instrucciones del paquete.',
      'En un bowl, coloca una base de espinacas frescas.',
      'Agrega la quinoa, el aguacate y los garbanzos.',
      'Espolvorea semillas de sesamo por encima.',
      'Bana con el aderezo de tahini antes de servir.',
    ],
  },
  {
    id: '2',
    title: 'Ensalada de pollo con quinoa tostada',
    calories: 320,
    time: 15,
    category: 'Fase Folicular',
    phaseKey: 'follicular',
    mealType: 'lunch',
    goals: ['pcos', 'energy', 'balance'],
    nutritionalInsight:
      'La proteina del pollo y los aminoacidos de la quinoa te daran la energia sostenida ideal para esta etapa ascendente de tu ciclo.',
    image: { uri: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=800' },
    ingredients: [
      '1 pechuga de pollo asada en trozos',
      '1/2 taza de quinoa tostada',
      '2 tazas de espinaca fresca o kale',
      '1/2 aguacate rebanado',
      'Tomates cherry al gusto',
      'Aderezo ligero de limon y aceite de oliva',
    ],
    structuredIngredients: [
      { name: 'Pechuga de pollo', quantity: 1, unit: 'unidad', category: 'Proteins' },
      { name: 'Quinoa', quantity: 0.5, unit: 'taza', category: 'Grains' },
      { name: 'Espinaca fresca', quantity: 2, unit: 'tazas', category: 'Vegetables' },
      { name: 'Aguacate', quantity: 0.5, unit: 'unidad', category: 'Fruits' },
      { name: 'Tomates cherry', quantity: 8, unit: 'unidades', category: 'Vegetables' },
      { name: 'Aceite de oliva y limón', quantity: 1, unit: 'aderezo', category: 'Pantry' }
    ],
    keyIngredients: [
      { name: 'Pechuga de pollo', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=150', note: 'Proteína magra clave para el desarrollo muscular y mantener la saciedad.' },
      { name: 'Quinoa', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150', note: 'Gran fuente de fibra que ayuda a metabolizar el estrógeno en aumento.' }
    ],
    instructions: [
      'Tuesta la quinoa en una sarten a fuego medio hasta que este dorada.',
      'En un bowl amplio, mezcla la espinaca, el pollo, el tomate y el aguacate.',
      'Agrega la quinoa tostada encima para un toque crujiente.',
      'Bana con el aderezo ligero justo antes de comer para mantener la frescura.',
    ],
  },
  {
    id: '3',
    title: 'Salmon con Esparragos y Limon',
    calories: 540,
    time: 30,
    category: 'Fase Ovulacion',
    phaseKey: 'ovulation',
    mealType: 'dinner',
    goals: ['acne', 'periods', 'balance'],
    nutritionalInsight:
      'El Omega-3 y el zinc del salmon son aliados clave para potenciar tu fertilidad y luminosidad natural en esta fase.',
    image: { uri: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800' },
    ingredients: [
      '200g de filete de salmon fresco',
      '1 manojo de esparragos tiernos',
      '2 cucharadas de aceite de oliva',
      'Rodajas de limon amarillo',
      'Sal de mar y pimienta negra',
    ],
    structuredIngredients: [
      { name: 'Filete de salmón', quantity: 200, unit: 'g', category: 'Proteins' },
      { name: 'Espárragos', quantity: 1, unit: 'manojo', category: 'Vegetables' },
      { name: 'Aceite de oliva', quantity: 2, unit: 'cucharadas', category: 'Pantry' },
      { name: 'Limón amarillo', quantity: 1, unit: 'unidad', category: 'Fruits' }
    ],
    keyIngredients: [
      { name: 'Salmón', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=150', note: 'Rico en Omega-3 que reduce la inflamación y promueve la salud folicular.' },
      { name: 'Espárragos', image: 'https://images.unsplash.com/photo-1515471209610-dae1c92d8777?w=150', note: 'Aportan ácido fólico y antioxidantes esenciales durante la ventana fértil.' }
    ],
    instructions: [
      'Precalienta el horno a 200C.',
      'Coloca el salmon y los esparragos en una bandeja para hornear.',
      'Rocia con aceite de oliva y sazona con sal y mucha pimienta.',
      'Coloca las rodajas de limon sobre el salmon.',
      'Hornea durante 12-15 minutos hasta que el salmon este cocido.',
    ],
  },
  {
    id: '4',
    title: 'Poke bowl de arroz con atun, mango y aguacate',
    calories: 450,
    time: 20,
    category: 'Fase Lutea',
    phaseKey: 'luteal',
    mealType: 'dinner',
    goals: ['periods', 'energy', 'digestion'],
    nutritionalInsight:
      'Las grasas saludables del aguacate y el atun, junto a la energia del arroz, promueven saciedad y balancean tus emociones antes de tu periodo.',
    image: { uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800' },
    ingredients: [
      '1 taza de arroz integral',
      '150g de atun fresco en cubos',
      '1/2 mango maduro en cubos',
      '1/2 aguacate en rebanadas',
      'Edamames al gusto',
      'Salsa ponzu o soya baja en sodio',
      'Semillas de sesamo para decorar',
    ],
    structuredIngredients: [
      { name: 'Arroz integral', quantity: 1, unit: 'taza', category: 'Grains' },
      { name: 'Atún fresco', quantity: 150, unit: 'g', category: 'Proteins' },
      { name: 'Mango', quantity: 0.5, unit: 'unidad', category: 'Fruits' },
      { name: 'Aguacate', quantity: 0.5, unit: 'unidad', category: 'Fruits' },
      { name: 'Edamames', quantity: 0.25, unit: 'taza', category: 'Vegetables' },
      { name: 'Salsa ponzu', quantity: 1, unit: 'cucharada', category: 'Pantry' },
      { name: 'Semillas de sésamo', quantity: 1, unit: 'cucharadita', category: 'Pantry' }
    ],
    keyIngredients: [
      { name: 'Atún fresco', image: 'https://images.unsplash.com/photo-1501595091296-3a98412ccd7c?w=150', note: 'Aporta vitamina B6, que ayuda a mitigar los cambios de humor premenstruales.' },
      { name: 'Aguacate', image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=150', note: 'Grasas saludables y potasio para aliviar la hinchazón y mantener la saciedad.' }
    ],
    instructions: [
      'Cocina el arroz de acuerdo a las instrucciones y colocarlo como base en tu bowl.',
      'Acomoda armonicamente el atun, mango, aguacate y edamames sobre el arroz.',
      'Vierte la salsa elegida de manera uniforme.',
      'Decora con semillas de sesamo y disfruta frio.',
    ],
  },
  {
    id: '5',
    title: 'Avena cremosa con cacao y nuez',
    calories: 380,
    time: 12,
    category: 'Fase Menstrual',
    phaseKey: 'menstrual',
    mealType: 'breakfast',
    goals: ['periods', 'energy', 'digestion'],
    nutritionalInsight:
      'La avena tibia, el cacao y la nuez ofrecen confort y saciedad suave para los dias menstruales.',
    image: { uri: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=800' },
    ingredients: [
      '1 taza de avena',
      '2 tazas de leche de almendras',
      '1 cucharada de cacao puro',
      '1 cucharada de nuez picada',
      'Canela al gusto',
      '1 cucharadita de miel opcional',
    ],
    structuredIngredients: [
      { name: 'Avena', quantity: 1, unit: 'taza', category: 'Grains' },
      { name: 'Leche de almendras', quantity: 2, unit: 'tazas', category: 'Dairy' },
      { name: 'Cacao puro', quantity: 1, unit: 'cucharada', category: 'Pantry' },
      { name: 'Nuez picada', quantity: 1, unit: 'cucharada', category: 'Pantry' },
      { name: 'Canela', quantity: 0.5, unit: 'cucharadita', category: 'Pantry' },
      { name: 'Miel', quantity: 1, unit: 'cucharadita', category: 'Pantry' }
    ],
    keyIngredients: [
      { name: 'Cacao puro', image: 'https://images.unsplash.com/photo-1548907040-4d42b52125bf?w=150', note: 'Excelente fuente de magnesio que relaja la musculatura uterina aliviando cólicos.' },
      { name: 'Avena', image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=150', note: 'Carbohidratos complejos reconfortantes que estimulan la serotonina.' }
    ],
    instructions: [
      'Calienta la leche en una olla pequena.',
      'Agrega la avena, el cacao y la canela.',
      'Cocina a fuego bajo hasta que espese.',
      'Sirve con nuez picada y miel si deseas.',
    ],
  },
  {
    id: '6',
    title: 'Crema de calabaza con jengibre y lentejas',
    calories: 360,
    time: 28,
    category: 'Fase Menstrual',
    phaseKey: 'menstrual',
    mealType: 'dinner',
    goals: ['periods', 'digestion', 'balance'],
    nutritionalInsight:
      'Esta crema aporta hierro, fibra y calor para acompañarte en la fase menstrual.',
    image: { uri: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800' },
    ingredients: [
      '2 tazas de calabaza en cubos',
      '1 taza de lentejas cocidas',
      '1 trozo pequeno de jengibre',
      '1 cebolla pequena',
      '1 cucharada de aceite de oliva',
      'Sal y pimienta',
    ],
    structuredIngredients: [
      { name: 'Calabaza', quantity: 2, unit: 'tazas', category: 'Vegetables' },
      { name: 'Lentejas cocidas', quantity: 1, unit: 'taza', category: 'Proteins' },
      { name: 'Jengibre', quantity: 1, unit: 'trozo', category: 'Pantry' },
      { name: 'Cebolla', quantity: 1, unit: 'unidad', category: 'Vegetables' },
      { name: 'Aceite de oliva', quantity: 1, unit: 'cucharada', category: 'Pantry' }
    ],
    keyIngredients: [
      { name: 'Jengibre', image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=150', note: 'Poderoso antiinflamatorio natural que combate los cólicos menstruales.' },
      { name: 'Lentejas', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=150', note: 'Alto contenido de hierro no hemo para contrarrestar la fatiga menstrual.' }
    ],
    instructions: [
      'Sofrie la cebolla y el jengibre.',
      'Agrega la calabaza y agua o caldo.',
      'Cocina hasta que la calabaza ablande.',
      'Anade las lentejas y licua hasta obtener una crema suave.',
    ],
  },
  {
    id: '7',
    title: 'Tacos de pavo con col morada y pico de gallo',
    calories: 410,
    time: 20,
    category: 'Fase Folicular',
    phaseKey: 'follicular',
    mealType: 'dinner',
    goals: ['pcos', 'energy', 'digestion'],
    nutritionalInsight:
      'Proteina magra y vegetales crujientes acompañan el aumento de energia de la fase folicular.',
    image: { uri: 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=800' },
    ingredients: [
      '250g de pavo molido',
      '4 tortillas de maiz',
      '1 taza de col morada rallada',
      '1 tomate picado',
      '1/4 de cebolla morada',
      'Limón',
      'Sal y comino',
    ],
    structuredIngredients: [
      { name: 'Pavo molido', quantity: 250, unit: 'g', category: 'Proteins' },
      { name: 'Tortillas de maíz', quantity: 4, unit: 'unidades', category: 'Grains' },
      { name: 'Col morada', quantity: 1, unit: 'taza', category: 'Vegetables' },
      { name: 'Tomate', quantity: 1, unit: 'unidad', category: 'Vegetables' },
      { name: 'Cebolla morada', quantity: 0.25, unit: 'unidad', category: 'Vegetables' },
      { name: 'Limón', quantity: 1, unit: 'unidad', category: 'Fruits' }
    ],
    keyIngredients: [
      { name: 'Pavo molido', image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=150', note: 'Proteína magra de fácil digestión rica en triptófano para regular el estado de ánimo.' },
      { name: 'Col morada', image: 'https://images.unsplash.com/photo-1611105637889-3dfa1052643a?w=150', note: 'Rica en fitoestrógenos que ayudan a regular de forma natural las curvas de estrógeno.' }
    ],
    instructions: [
      'Cocina el pavo con sal y comino.',
      'Prepara el pico de gallo con tomate, cebolla y cilantro.',
      'Calienta las tortillas.',
      'Arma los tacos con col morada y termina con limon.',
    ],
  },
  {
    id: '8',
    title: 'Yogur griego con frutos rojos y semillas',
    calories: 290,
    time: 8,
    category: 'Fase Folicular',
    phaseKey: 'follicular',
    mealType: 'breakfast',
    goals: ['acne', 'pcos', 'digestion'],
    nutritionalInsight:
      'El yogur griego y las berries hacen de este un desayuno ligero y rico en proteina.',
    image: { uri: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800' },
    ingredients: [
      '1 taza de yogur griego natural',
      '1/2 taza de frutos rojos',
      '1 cucharada de semillas de chía',
      '1 cucharada de granola',
      'Miel opcional',
    ],
    structuredIngredients: [
      { name: 'Yogur griego', quantity: 1, unit: 'taza', category: 'Dairy' },
      { name: 'Frutos rojos', quantity: 0.5, unit: 'taza', category: 'Fruits' },
      { name: 'Semillas de chía', quantity: 1, unit: 'cucharada', category: 'Pantry' },
      { name: 'Granola', quantity: 1, unit: 'cucharada', category: 'Grains' }
    ],
    keyIngredients: [
      { name: 'Yogur griego', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=150', note: 'Aporta probióticos esenciales para mejorar la flora intestinal y regular andrógenos.' },
      { name: 'Frutos rojos', image: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=150', note: 'Altos en antioxidantes que combaten el acné y regulan el azúcar en sangre.' }
    ],
    instructions: [
      'Sirve el yogur en un bowl.',
      'Anade frutos rojos y semillas.',
      'Corona con granola y un hilo de miel si lo deseas.',
    ],
  },
  {
    id: '9',
    title: 'Tostadas de hummus con huevo y rucula',
    calories: 430,
    time: 15,
    category: 'Fase Ovulacion',
    phaseKey: 'ovulation',
    mealType: 'breakfast',
    goals: ['pcos', 'energy', 'balance'],
    nutritionalInsight:
      'Huevos, hojas verdes y garbanzos ofrecen una comida equilibrada para la ovulacion.',
    image: { uri: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=800' },
    ingredients: [
      '2 rebanadas de pan integral',
      '1/2 taza de hummus',
      '2 huevos',
      '1 taza de rucula',
      'Aceite de oliva',
      'Sal y pimienta',
    ],
    structuredIngredients: [
      { name: 'Pan integral', quantity: 2, unit: 'rebanadas', category: 'Grains' },
      { name: 'Hummus', quantity: 0.5, unit: 'taza', category: 'Proteins' },
      { name: 'Huevos', quantity: 2, unit: 'unidades', category: 'Proteins' },
      { name: 'Rúcula', quantity: 1, unit: 'taza', category: 'Vegetables' },
      { name: 'Aceite de oliva', quantity: 1, unit: 'cucharadita', category: 'Pantry' }
    ],
    keyIngredients: [
      { name: 'Huevos', image: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=150', note: 'Aportan colina y grasas saludables que promueven la calidad ovulatoria.' },
      { name: 'Hummus', image: 'https://images.unsplash.com/photo-1577906096429-f73bc2cdb977?w=150', note: 'Proteína vegetal de absorción controlada ideal para energía de larga duración.' }
    ],
    instructions: [
      'Tuesta el pan hasta que quede crujiente.',
      'Unta una capa generosa de hummus.',
      'Coloca el huevo cocido o a la plancha encima.',
      'Agrega rucula y termina con aceite de oliva.',
    ],
  },
  {
    id: '10',
    title: 'Ensalada de camote, naranja y pepitas',
    calories: 390,
    time: 18,
    category: 'Fase Ovulacion',
    phaseKey: 'ovulation',
    mealType: 'lunch',
    goals: ['acne', 'periods', 'digestion'],
    nutritionalInsight:
      'La vitamina C de la naranja y los minerales de las pepitas hacen esta ensalada luminosa y fresca.',
    image: { uri: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800' },
    ingredients: [
      '1 camote mediano asado',
      '1 naranja en gajos',
      '2 tazas de espinaca',
      '2 cucharadas de pepitas de calabaza',
      'Aderezo de aceite de oliva y limon',
    ],
    structuredIngredients: [
      { name: 'Camote', quantity: 1, unit: 'unidad', category: 'Vegetables' },
      { name: 'Naranja', quantity: 1, unit: 'unidad', category: 'Fruits' },
      { name: 'Espinaca', quantity: 2, unit: 'tazas', category: 'Vegetables' },
      { name: 'Pepitas de calabaza', quantity: 2, unit: 'cucharadas', category: 'Pantry' },
      { name: 'Aceite de oliva y limón', quantity: 1, unit: 'aderezo', category: 'Pantry' }
    ],
    keyIngredients: [
      { name: 'Pepitas de calabaza', image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=150', note: 'Altas en zinc, que ayuda a mitigar la aparición de brotes de acné hormonal.' },
      { name: 'Naranja', image: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=150', note: 'La vitamina C favorece la síntesis de colágeno y la absorción de hierro.' }
    ],
    instructions: [
      'Asa el camote hasta que quede tierno.',
      'Mezcla espinaca, naranja y camote.',
      'Agrega pepitas.',
      'Aliña con aceite de oliva y limon.',
    ],
  },
  {
    id: '11',
    title: 'Curry suave de garbanzos y coco',
    calories: 470,
    time: 30,
    category: 'Fase Lutea',
    phaseKey: 'luteal',
    mealType: 'dinner',
    goals: ['periods', 'energy', 'balance'],
    nutritionalInsight:
      'Los carbohidratos reconfortantes y los garbanzos ayudan con los antojos de la fase lutea.',
    image: { uri: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800' },
    ingredients: [
      '1 taza de garbanzos cocidos',
      '1 taza de leche de coco',
      '1 cebolla pequeña',
      '1 diente de ajo',
      '1 cucharadita de curry suave',
      '1 taza de arroz integral cocido',
    ],
    structuredIngredients: [
      { name: 'Garbanzos cocidos', quantity: 1, unit: 'taza', category: 'Proteins' },
      { name: 'Leche de coco', quantity: 1, unit: 'taza', category: 'Dairy' },
      { name: 'Cebolla', quantity: 1, unit: 'unidad', category: 'Vegetables' },
      { name: 'Ajo', quantity: 1, unit: 'diente', category: 'Vegetables' },
      { name: 'Curry suave', quantity: 1, unit: 'cucharadita', category: 'Pantry' },
      { name: 'Arroz integral', quantity: 1, unit: 'taza', category: 'Grains' }
    ],
    keyIngredients: [
      { name: 'Leche de coco', image: 'https://images.unsplash.com/photo-1563865436874-9aef32095ffd?w=150', note: 'Grasas saludables de fácil absorción que brindan saciedad y reducen antojos dulces.' },
      { name: 'Garbanzos', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=150', note: 'Carbohidratos complejos de absorción lenta que estabilizan la glucemia.' }
    ],
    instructions: [
      'Sofrie la cebolla y el ajo.',
      'Anade el curry y los garbanzos.',
      'Vierte la leche de coco y cocina 10 minutos.',
      'Sirve sobre arroz integral y decora con cilantro.',
    ],
  },
  {
    id: '12',
    title: 'Pasta integral con sardinas y espinacas',
    calories: 520,
    time: 22,
    category: 'Fase Lutea',
    phaseKey: 'luteal',
    mealType: 'dinner',
    goals: ['periods', 'energy', 'balance'],
    nutritionalInsight:
      'Omega-3, fibra y carbohidratos completos sostienen la energia y la saciedad.',
    image: { uri: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800' },
    ingredients: [
      '200g de pasta integral',
      '1 lata de sardinas en aceite de oliva',
      '2 tazas de espinaca',
      '1 diente de ajo',
      'Limón',
    ],
    structuredIngredients: [
      { name: 'Pasta integral', quantity: 200, unit: 'g', category: 'Grains' },
      { name: 'Sardinas en lata', quantity: 1, unit: 'lata', category: 'Proteins' },
      { name: 'Espinaca', quantity: 2, unit: 'tazas', category: 'Vegetables' },
      { name: 'Ajo', quantity: 1, unit: 'diente', category: 'Vegetables' }
    ],
    keyIngredients: [
      { name: 'Sardinas', image: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=150', note: 'Excelente fuente de calcio y omega-3 para regular prostaglandinas inflamatorias.' },
      { name: 'Pasta integral', image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=150', note: 'Fibra dietética que apoya al colon en la excreción eficiente de estrógenos.' }
    ],
    instructions: [
      'Cocina la pasta al dente.',
      'Saltea el ajo con la espinaca.',
      'Agrega las sardinas y un poco de limon.',
      'Mezcla con la pasta y termina con pimienta.',
    ],
  },
  {
    id: '13',
    title: 'Mix de nueces y chocolate oscuro',
    calories: 180,
    time: 5,
    category: 'Fase Lutea',
    phaseKey: 'luteal',
    mealType: 'snack',
    goals: ['periods', 'energy', 'balance'],
    nutritionalInsight:
      'El magnesio del cacao ayuda a reducir la tension premenstrual.',
    image: { uri: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800' },
    ingredients: [
      '30g de nueces mixtas',
      '2 cuadritos de chocolate oscuro 70%+',
    ],
    structuredIngredients: [
      { name: 'Nueces mixtas', quantity: 30, unit: 'g', category: 'Pantry' },
      { name: 'Chocolate oscuro 70%+', quantity: 2, unit: 'cuadros', category: 'Pantry' }
    ],
    keyIngredients: [
      { name: 'Chocolate oscuro', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=150', note: 'Satisface de forma saludable el antojo de dulce aportando magnesio y antioxidantes.' },
      { name: 'Nueces mixtas', image: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=150', note: 'Grasas insaturadas que ayudan a equilibrar la relación progesterona/estrógeno.' }
    ],
    instructions: [
      'Mezcla las nueces y el chocolate en un tazon pequeno.',
    ],
  },
  {
    id: '14',
    title: 'Batido verde energizante',
    calories: 210,
    time: 10,
    category: 'Fase Folicular',
    phaseKey: 'follicular',
    mealType: 'snack',
    goals: ['acne', 'energy', 'digestion'],
    nutritionalInsight:
      'Ideal para media manana durante tu fase de mayor creatividad.',
    image: { uri: 'https://images.unsplash.com/photo-1544145945-f904253d0c71?w=800' },
    ingredients: [
      '1 taza de espinaca',
      '1/2 platano',
      '1/2 taza de piña',
      '1 taza de agua de coco',
    ],
    structuredIngredients: [
      { name: 'Espinaca', quantity: 1, unit: 'taza', category: 'Vegetables' },
      { name: 'Plátano', quantity: 0.5, unit: 'unidad', category: 'Fruits' },
      { name: 'Piña', quantity: 0.5, unit: 'taza', category: 'Fruits' },
      { name: 'Agua de coco', quantity: 1, unit: 'taza', category: 'Dairy' }
    ],
    keyIngredients: [
      { name: 'Agua de coco', image: 'https://images.unsplash.com/photo-1542157585-ef20faccc469?w=150', note: 'Repone electrolitos esenciales and mejora los niveles de energía celular.' },
      { name: 'Espinaca', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=150', note: 'Clorofila y fibra que estimulan la función hepática de desintoxicación.' }
    ],
    instructions: [
      'Licua todos los ingredientes hasta que este suave.',
    ],
  },
  // --- New Recipes added to satisfy Swap options requirement (3 alternatives per category) ---
  {
    id: '15',
    title: 'Pancakes de Avena y Plátano',
    calories: 320,
    time: 15,
    category: 'Fase Lutea',
    phaseKey: 'luteal',
    mealType: 'breakfast',
    goals: ['periods', 'energy', 'digestion'],
    nutritionalInsight: 'El plátano aporta potasio y la avena brinda fibra para controlar el ánimo en la fase lútea.',
    image: { uri: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800' },
    ingredients: [
      '1/2 taza de avena licuada',
      '1 plátano maduro',
      '1 huevo',
      '1/4 taza de leche de almendras',
      '1 cucharadita de canela',
    ],
    structuredIngredients: [
      { name: 'Avena', quantity: 0.5, unit: 'taza', category: 'Grains' },
      { name: 'Plátano', quantity: 1, unit: 'unidad', category: 'Fruits' },
      { name: 'Huevo', quantity: 1, unit: 'unidad', category: 'Proteins' },
      { name: 'Leche de almendras', quantity: 0.25, unit: 'taza', category: 'Dairy' },
      { name: 'Canela', quantity: 1, unit: 'cucharadita', category: 'Pantry' }
    ],
    keyIngredients: [
      { name: 'Plátano', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=150', note: 'Excelente fuente de potasio y vitamina B6 para aliviar retención de líquidos premenstrual.' },
      { name: 'Avena', image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=150', note: 'Aporta betaglucanos para estabilizar los niveles de azúcar y energía.' }
    ],
    instructions: [
      'Licua la avena, el plátano, el huevo, la leche de almendras y la canela.',
      'Calienta una sartén antiadherente a fuego medio.',
      'Vierte pequeñas porciones de la mezcla y cocina 2-3 minutos por lado.',
      'Sirve caliente.'
    ]
  },
  {
    id: '16',
    title: 'Tazón de Yogur con Semillas de Girasol',
    calories: 260,
    time: 5,
    category: 'Fase Lutea',
    phaseKey: 'luteal',
    mealType: 'snack',
    goals: ['periods', 'acne', 'balance'],
    nutritionalInsight: 'El girasol es alto en selenio y vitamina E, ideales para la salud lútea.',
    image: { uri: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800' },
    ingredients: [
      '1 taza de yogur griego',
      '2 cucharadas de semillas de girasol',
      '1/2 taza de arándanos',
      'Canela'
    ],
    structuredIngredients: [
      { name: 'Yogur griego', quantity: 1, unit: 'taza', category: 'Dairy' },
      { name: 'Semillas de girasol', quantity: 2, unit: 'cucharadas', category: 'Pantry' },
      { name: 'Arándanos', quantity: 0.5, unit: 'taza', category: 'Fruits' }
    ],
    keyIngredients: [
      { name: 'Semillas de girasol', image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=150', note: 'Altas en vitamina E, vital para apoyar la síntesis de progesterona.' }
    ],
    instructions: [
      'Sirve el yogur griego en un tazón.',
      'Agrega las semillas de girasol y los arándanos por encima.',
      'Decora con una pizca de canela.'
    ]
  },
  {
    id: '17',
    title: 'Ensalada de Lentejas y Aguacate',
    calories: 380,
    time: 15,
    category: 'Fase Lutea',
    phaseKey: 'luteal',
    mealType: 'lunch',
    goals: ['periods', 'digestion', 'energy'],
    nutritionalInsight: 'Alto contenido de zinc y grasas buenas para estabilizar tus hormonas antes de la menstruación.',
    image: { uri: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800' },
    ingredients: [
      '1 taza de lentejas cocidas',
      '1/2 aguacate picado',
      '1 tomate picado',
      'Cilantro y limón',
      '1 cucharada de aceite de oliva'
    ],
    structuredIngredients: [
      { name: 'Lentejas cocidas', quantity: 1, unit: 'taza', category: 'Proteins' },
      { name: 'Aguacate', quantity: 0.5, unit: 'unidad', category: 'Fruits' },
      { name: 'Tomate', quantity: 1, unit: 'unidad', category: 'Vegetables' },
      { name: 'Aceite de oliva', quantity: 1, unit: 'cucharada', category: 'Pantry' }
    ],
    keyIngredients: [
      { name: 'Lentejas', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=150', note: 'Carbohidrato complejo rico en fibra para contrarrestar el estreñimiento premenstrual.' },
      { name: 'Aguacate', image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=150', note: 'Grasas que reducen los antojos recurrentes en esta fase.' }
    ],
    instructions: [
      'En un tazón, mezcla las lentejas cocidas con el tomate y el aguacate picados.',
      'Agrega cilantro picado y exprime el jugo de un limón.',
      'Aliña con el aceite de oliva, sal y pimienta al gusto.'
    ]
  },
  {
    id: '18',
    title: 'Batido de Fresa y Linaza',
    calories: 220,
    time: 5,
    category: 'Fase Menstrual',
    phaseKey: 'menstrual',
    mealType: 'snack',
    goals: ['periods', 'acne', 'digestion'],
    nutritionalInsight: 'La linaza ayuda a desechar el estrógeno usado y las fresas aportan vitamina C para la absorción de hierro.',
    image: { uri: 'https://images.unsplash.com/photo-1544145945-f904253d0c71?w=800' },
    ingredients: [
      '1 taza de fresas frescas',
      '1 cucharada de linaza molida',
      '1 taza de bebida vegetal de avena',
      '1/2 taza de espinacas baby'
    ],
    structuredIngredients: [
      { name: 'Fresas', quantity: 1, unit: 'taza', category: 'Fruits' },
      { name: 'Linaza molida', quantity: 1, unit: 'cucharada', category: 'Pantry' },
      { name: 'Bebida de avena', quantity: 1, unit: 'taza', category: 'Dairy' },
      { name: 'Espinaca baby', quantity: 0.5, unit: 'taza', category: 'Vegetables' }
    ],
    keyIngredients: [
      { name: 'Linaza molida', image: 'https://images.unsplash.com/photo-1600857544200-e2b8c5e6361a?w=150', note: 'Contiene lignanos que equilibran los niveles de estrógeno de forma natural.' }
    ],
    instructions: [
      'Coloca todos los ingredientes en una licuadora.',
      'Licua a alta velocidad hasta obtener una consistencia cremosa y sin grumos.',
      'Sirve de inmediato.'
    ]
  },
  {
    id: '19',
    title: 'Trufas de Cacao y Dátil',
    calories: 190,
    time: 10,
    category: 'Fase Menstrual',
    phaseKey: 'menstrual',
    mealType: 'snack',
    goals: ['periods', 'energy', 'balance'],
    nutritionalInsight: 'Dulce saludable cargado de potasio y magnesio para atenuar dolores uterinos.',
    image: { uri: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800' },
    ingredients: [
      '6 dátiles sin carozo',
      '2 cucharadas de cacao en polvo',
      '1 cucharada de almendras molidas',
      'Agua de ser necesario'
    ],
    structuredIngredients: [
      { name: 'Dátiles', quantity: 6, unit: 'unidades', category: 'Fruits' },
      { name: 'Cacao en polvo', quantity: 2, unit: 'cucharadas', category: 'Pantry' },
      { name: 'Almendras molidas', quantity: 1, unit: 'cucharada', category: 'Pantry' }
    ],
    keyIngredients: [
      { name: 'Dátiles', image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=150', note: 'Brindan energía rápida y natural con potasio para mitigar cólicos.' }
    ],
    instructions: [
      'Procesa los dátiles con el cacao y las almendras hasta obtener una pasta.',
      'Forma pequeñas bolitas con las manos.',
      'Pásalas por un poco de cacao en polvo extra para decorar.'
    ]
  },
  {
    id: '20',
    title: 'Crema de Calabacín y Almendras',
    calories: 270,
    time: 20,
    category: 'Fase Folicular',
    phaseKey: 'follicular',
    mealType: 'lunch',
    goals: ['acne', 'pcos', 'digestion'],
    nutritionalInsight: 'El calabacín es hidratante y la crema de almendras provee vitamina E para restaurar la piel.',
    image: { uri: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800' },
    ingredients: [
      '2 calabacines medianos',
      '1 cebolla',
      '2 cucharadas de crema de almendras',
      '1 cucharada de aceite de oliva',
      'Caldo de verduras'
    ],
    structuredIngredients: [
      { name: 'Calabacines', quantity: 2, unit: 'unidades', category: 'Vegetables' },
      { name: 'Cebolla', quantity: 1, unit: 'unidad', category: 'Vegetables' },
      { name: 'Crema de almendras', quantity: 2, unit: 'cucharadas', category: 'Pantry' },
      { name: 'Aceite de oliva', quantity: 1, unit: 'cucharada', category: 'Pantry' }
    ],
    keyIngredients: [
      { name: 'Calabacín', image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=150', note: 'Vegetal de bajo índice glucémico y alto contenido de agua purificante.' },
      { name: 'Crema de almendras', image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=150', note: 'Aporta grasas monoinsaturadas y vitamina E para la salud dérmica.' }
    ],
    instructions: [
      'Saltea la cebolla picada en aceite de oliva.',
      'Añade los calabacines troceados y cubre con caldo.',
      'Cocina por 15 minutos, añade la crema de almendras y licua hasta que quede suave.'
    ]
  },
  {
    id: '21',
    title: 'Budín de Chía y Coco',
    calories: 240,
    time: 10,
    category: 'Fase Ovulacion',
    phaseKey: 'ovulation',
    mealType: 'snack',
    goals: ['acne', 'periods', 'digestion'],
    nutritionalInsight: 'Las semillas de chía ayudan a capturar el estrógeno circulante para evitar la dominancia estrogénica.',
    image: { uri: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800' },
    ingredients: [
      '3 cucharadas de semillas de chía',
      '1 taza de leche de coco ligera',
      '1/2 taza de mango maduro picado',
      'Canela y vainilla'
    ],
    structuredIngredients: [
      { name: 'Semillas de chía', quantity: 3, unit: 'cucharadas', category: 'Pantry' },
      { name: 'Leche de coco', quantity: 1, unit: 'taza', category: 'Dairy' },
      { name: 'Mango', quantity: 0.5, unit: 'taza', category: 'Fruits' }
    ],
    keyIngredients: [
      { name: 'Semillas de chía', image: 'https://images.unsplash.com/photo-1600857544200-e2b8c5e6361a?w=150', note: 'Excelente fuente de fibra soluble para la eliminación de hormonas usadas.' }
    ],
    instructions: [
      'Mezcla las semillas de chía con la leche de coco, vainilla y canela.',
      'Revuelve bien y deja reposar por al menos 2 horas o refrigerar toda la noche.',
      'Sirve con cubitos de mango fresco encima.'
    ]
  },
  {
    id: '22',
    title: 'Wraps de Hummus y Hojas Verdes',
    calories: 310,
    time: 10,
    category: 'Fase Ovulacion',
    phaseKey: 'ovulation',
    mealType: 'lunch',
    goals: ['pcos', 'energy', 'digestion'],
    nutritionalInsight: 'Ligero y repleto de fibra para acompañar la alta energía y digestión fuerte en ovulación.',
    image: { uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800' },
    ingredients: [
      '2 tortillas de linaza o integrales',
      '1/2 taza de hummus de garbanzos',
      '1 taza de brotes de alfalfa o espinacas',
      '1/2 pepino cortado en tiras',
      'Zanahoria rallada al gusto'
    ],
    structuredIngredients: [
      { name: 'Tortillas integrales', quantity: 2, unit: 'unidades', category: 'Grains' },
      { name: 'Hummus', quantity: 0.5, unit: 'taza', category: 'Proteins' },
      { name: 'Brotes de alfalfa', quantity: 1, unit: 'taza', category: 'Vegetables' },
      { name: 'Pepino', quantity: 0.5, unit: 'unidad', category: 'Vegetables' },
      { name: 'Zanahoria', quantity: 0.5, unit: 'unidad', category: 'Vegetables' }
    ],
    keyIngredients: [
      { name: 'Brotes de alfalfa', image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=150', note: 'Altamente enzimáticos y ricos en clorofila para la purificación de la piel.' }
    ],
    instructions: [
      'Extiende las tortillas integrales.',
      'Unta una capa generosa de hummus sobre cada tortilla.',
      'Distribuye los brotes de alfalfa, el pepino y la zanahoria.',
      'Enrolla firmemente y corta a la mitad.'
    ]
  }
];

export const CURRENT_PHASE = {
  name: 'Folicular',
  day: 8,
  message:
    'Tu estrogeno esta subiendo. Es el momento perfecto para enfocarte en carbohidratos complejos y alimentos ricos en vitamina E.',
};

export const PHASES_DATA = {
  menstrual: {
    name: 'Menstrual',
    color: '#E57373', // Soft red
    focus: 'Hierro & Vitamina C',
    advice: 'Prioriza alimentos calientes y nutritivos para mejorar el flujo y la energia.',
  },
  follicular: {
    name: 'Folicular',
    color: '#A3B3A5', // Sage Green
    focus: 'Probioticos & Fiber',
    advice: 'Excelente momento para alimentos fermentados que ayuden a metabolizar el estrogeno.',
  },
  ovulation: {
    name: 'Ovulacion',
    color: '#7BC8B8', // Mint/Blue
    focus: 'Antioxidantes',
    advice: 'Consume vegetales de hoja verde y frutas ricas en zinc para apoyar la fertilidad.',
  },
  luteal: {
    name: 'Lutea',
    color: '#E2A93E', // Gold/Amber
    focus: 'Magnesio & Vitamina B6',
    advice: 'Opta por carbohidratos complejos para estabilizar el azucar en sangre y el animo.',
  },
};
