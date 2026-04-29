export const extractYouTubeId = (url) => {
  if (!url) return '';
  // Support for standard, shorts, and mobile URLs
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?)|(shorts\/))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[8] && match[8].length === 11) {
    return match[8];
  }
  
  // Alternative check for direct IDs or other formats
  const directIdMatch = url.match(/(?:shorts\/|v=)([a-zA-Z0-9_-]{11})/);
  if (directIdMatch) return directIdMatch[1];

  return url;
};

export const VIDEO_LIBRARY = [
  {
    id: 'video-follicular-1',
    phaseKey: 'follicular',
    category: 'Fase folicular',
    contentType: 'recipe',
    mealType: 'snack',
    title: 'Receta corta para fase folicular',
    description:
      'Una idea rápida para acompañar la etapa de energía ascendente con ingredientes frescos y saciantes.',
    youtubeUrl: 'https://youtube.com/shorts/GdTEDblpPxY?feature=share',
    duration: '0:56',
    thumbnail: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
  },
  {
    id: 'video-cycle-1',
    phaseKey: 'luteal',
    category: 'Ciclo y nutrición',
    contentType: 'educational',
    mealType: 'dinner',
    title: 'Cómo conectar tu fase con tus comidas',
    description:
      'Explica de forma simple por qué las recomendaciones cambian según el momento de tu ciclo.',
    youtubeUrl: 'https://youtube.com/shorts/Shg1SZKzZzw?feature=share',
    duration: '1:12',
    thumbnail: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
  },
  {
    id: 'video-menstrual-1',
    phaseKey: 'menstrual',
    category: 'Bienestar menstrual',
    contentType: 'wellness',
    mealType: 'breakfast',
    title: 'Pausa suave para días menstruales',
    description:
      'Una propuesta de respiración y descanso para acompañar la menstruación con más calma y confort.',
    youtubeUrl: 'https://www.youtube.com/watch?v=B4kNiCwtl7M',
    duration: '3:45',
    thumbnail: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
  },
  {
    id: 'video-ovulation-1',
    phaseKey: 'ovulation',
    category: 'Fertilidad y energía',
    contentType: 'fitness',
    mealType: 'lunch',
    title: 'Movimiento consciente para ovulación',
    description:
      'Contenido pensado para los días de mayor vitalidad, con foco en energía, ligereza y equilibrio.',
    youtubeUrl: 'https://www.youtube.com/watch?v=inpok4MKVLM',
    duration: '5:04',
    thumbnail: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  },
].map((video) => ({
  ...video,
  youtubeId: extractYouTubeId(video.youtubeUrl),
}));
