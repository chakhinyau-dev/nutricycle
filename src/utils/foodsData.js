export const FOODS_BY_PHASE = {
  menstrual: [
    {
      categoryKey: 'proteins',
      items: [
        { key: 'lentejas',       mealType: 'lunch',     hormoneTag: 'antiinflammatory', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=150' },
        { key: 'salmon_salvaje', mealType: 'dinner',    hormoneTag: 'antiinflammatory', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=150' }
      ]
    },
    {
      categoryKey: 'fats',
      items: [
        { key: 'semillas_lino',  mealType: 'breakfast', hormoneTag: 'estrogen',          image: 'https://images.unsplash.com/photo-1600857544200-e2b8c5e6361a?w=150' },
        { key: 'nueces',         mealType: 'snack',     hormoneTag: 'energy',            image: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=150' }
      ]
    },
    {
      categoryKey: 'carbs',
      items: [
        { key: 'avena_integral', mealType: 'breakfast', hormoneTag: 'energy',            image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=150' },
        { key: 'quinoa',         mealType: 'lunch',     hormoneTag: 'progesterone',      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150' }
      ]
    },
    {
      categoryKey: 'veg_fruits',
      items: [
        { key: 'espinacas',      mealType: 'lunch',     hormoneTag: 'antiinflammatory', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=150' },
        { key: 'fresas_berries', mealType: 'breakfast', hormoneTag: 'antiinflammatory', image: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=150' }
      ]
    }
  ],
  follicular: [
    {
      categoryKey: 'proteins',
      items: [
        { key: 'pollo_pastoreo',    mealType: 'lunch',     hormoneTag: 'estrogen',      image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=150' },
        { key: 'garbanzos',         mealType: 'lunch',     hormoneTag: 'estrogen',      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=150' }
      ]
    },
    {
      categoryKey: 'fats',
      items: [
        { key: 'semillas_calabaza', mealType: 'snack',     hormoneTag: 'estrogen',      image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=150' },
        { key: 'almendras',         mealType: 'snack',     hormoneTag: 'estrogen',      image: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=150' }
      ]
    },
    {
      categoryKey: 'carbs',
      items: [
        { key: 'arroz_integral',    mealType: 'dinner',    hormoneTag: 'energy',        image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=150' }
      ]
    },
    {
      categoryKey: 'veg_fruits',
      items: [
        { key: 'brocoli',           mealType: 'dinner',    hormoneTag: 'estrogen',      image: 'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?w=150' },
        { key: 'aguacate',          mealType: 'breakfast', hormoneTag: 'progesterone',  image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=150' }
      ]
    }
  ],
  ovulation: [
    {
      categoryKey: 'proteins',
      items: [
        { key: 'pescado_blanco',   mealType: 'lunch',     hormoneTag: 'energy',         image: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=150' },
        { key: 'huevos_organicos', mealType: 'breakfast', hormoneTag: 'progesterone',   image: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=150' }
      ]
    },
    {
      categoryKey: 'fats',
      items: [
        { key: 'semillas_sesamo',  mealType: 'snack',     hormoneTag: 'progesterone',  image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=150' },
        { key: 'aceite_oliva',     mealType: 'dinner',    hormoneTag: 'antiinflammatory', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=150' }
      ]
    },
    {
      categoryKey: 'carbs',
      items: [
        { key: 'quinoa_cocida',    mealType: 'dinner',    hormoneTag: 'energy',         image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150' }
      ]
    },
    {
      categoryKey: 'veg_fruits',
      items: [
        { key: 'hojas_verdes',     mealType: 'lunch',     hormoneTag: 'estrogen',       image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=150' },
        { key: 'frambuesas',       mealType: 'breakfast', hormoneTag: 'antiinflammatory', image: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=150' }
      ]
    }
  ],
  luteal: [
    {
      categoryKey: 'proteins',
      items: [
        { key: 'pavo',      mealType: 'dinner', hormoneTag: 'energy',                image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=150' },
        { key: 'legumbres', mealType: 'lunch',  hormoneTag: 'progesterone',          image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=150' }
      ]
    },
    {
      categoryKey: 'fats',
      items: [
        { key: 'semillas_girasol',      mealType: 'snack',     hormoneTag: 'progesterone', image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=150' },
        { key: 'mantequilla_almendras', mealType: 'breakfast', hormoneTag: 'energy',       image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=150' }
      ]
    },
    {
      categoryKey: 'carbs',
      items: [
        { key: 'camote',        mealType: 'dinner',    hormoneTag: 'energy',          image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=150' },
        { key: 'arroz_integral', mealType: 'dinner',   hormoneTag: 'energy',          image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=150' }
      ]
    },
    {
      categoryKey: 'veg_fruits',
      items: [
        { key: 'calabaza', mealType: 'lunch',     hormoneTag: 'progesterone',        image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=150' },
        { key: 'platano',  mealType: 'breakfast', hormoneTag: 'energy',              image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=150' }
      ]
    }
  ]
};
