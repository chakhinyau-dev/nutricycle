export const FOODS_BY_PHASE = {
  menstrual: [
    {
      categoryKey: 'proteins',
      items: [
        { key: 'lentejas',       mealType: 'lunch',     hormoneTag: 'antiinflammatory', image: 'https://images.unsplash.com/photo-1763368392508-3d4bddfdd20a?w=150' },
        { key: 'salmon_salvaje', mealType: 'dinner',    hormoneTag: 'antiinflammatory', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=150' }
      ]
    },
    {
      categoryKey: 'fats',
      items: [
        { key: 'semillas_lino',  mealType: 'breakfast', hormoneTag: 'estrogen',          image: 'https://images.unsplash.com/photo-1642497393790-c5751b818e1b?w=150' },
        { key: 'nueces',         mealType: 'snack',     hormoneTag: 'energy',            image: 'https://images.unsplash.com/photo-1512905024369-fe9701b6d8f1?w=150' }
      ]
    },
    {
      categoryKey: 'carbs',
      items: [
        { key: 'avena_integral', mealType: 'breakfast', hormoneTag: 'energy',            image: 'https://images.unsplash.com/photo-1510776478953-fa4dc5de04ca?w=150' },
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
        { key: 'garbanzos',         mealType: 'lunch',     hormoneTag: 'estrogen',      image: 'https://images.unsplash.com/photo-1644432757699-bb5a01e8fb0e?w=150' }
      ]
    },
    {
      categoryKey: 'fats',
      items: [
        { key: 'semillas_calabaza', mealType: 'snack',     hormoneTag: 'estrogen',      image: 'https://images.unsplash.com/photo-1545447859-6a9eca16e6ed?w=150' },
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
        { key: 'semillas_sesamo',  mealType: 'snack',     hormoneTag: 'progesterone',  image: 'https://images.unsplash.com/photo-1705026042359-2d5b761845f3?w=150' },
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
        { key: 'frambuesas',       mealType: 'breakfast', hormoneTag: 'antiinflammatory', image: 'https://images.unsplash.com/photo-1633073837249-b5ead582a761?w=150' }
      ]
    }
  ],
  luteal: [
    {
      categoryKey: 'proteins',
      items: [
        { key: 'pavo',      mealType: 'dinner', hormoneTag: 'energy',                image: 'https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?w=150' },
        { key: 'legumbres', mealType: 'lunch',  hormoneTag: 'progesterone',          image: 'https://images.unsplash.com/photo-1662743086910-38419bbf7f34?w=150' }
      ]
    },
    {
      categoryKey: 'fats',
      items: [
        { key: 'semillas_girasol',      mealType: 'snack',     hormoneTag: 'progesterone', image: 'https://images.unsplash.com/photo-1635843111961-06c71c3ed8cf?w=150' },
        { key: 'mantequilla_almendras', mealType: 'breakfast', hormoneTag: 'energy',       image: 'https://images.unsplash.com/photo-1654747781271-a2b6992c7b52?w=150' }
      ]
    },
    {
      categoryKey: 'carbs',
      items: [
        { key: 'camote',        mealType: 'dinner',    hormoneTag: 'energy',          image: 'https://images.unsplash.com/photo-1570723735746-c9bd51bd7c40?w=150' },
        { key: 'arroz_integral', mealType: 'dinner',   hormoneTag: 'energy',          image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=150' }
      ]
    },
    {
      categoryKey: 'veg_fruits',
      items: [
        { key: 'calabaza', mealType: 'lunch',     hormoneTag: 'progesterone',        image: 'https://images.unsplash.com/photo-1508298593117-02b95f83abca?w=150' },
        { key: 'platano',  mealType: 'breakfast', hormoneTag: 'energy',              image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=150' }
      ]
    }
  ]
};
