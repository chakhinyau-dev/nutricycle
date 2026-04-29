import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const fromNow = (value) =>
  formatDistanceToNow(new Date(value), {
    addSuffix: true,
    locale: es,
  });

export const buildNotifications = ({ cycleInfo, recipes = [], logs = [] }) => {
  const notifications = [];

  if (cycleInfo) {
    notifications.push({
      id: 'phase',
      title: `Estás en fase ${cycleInfo.currentPhaseLabel}`,
      message: `Hoy es el día ${cycleInfo.cycleDay} de tu ciclo. Tus recetas y videos ya están ajustados a esta fase.`,
      time: 'ahora',
      type: 'phase',
      isNew: true,
    });

    notifications.push({
      id: 'next-period',
      title: 'Próximo periodo estimado',
      message: `Tu siguiente periodo está previsto en ${cycleInfo.daysUntilNextPeriod} días.`,
      time: 'hoy',
      type: 'cycle',
      isNew: cycleInfo.daysUntilNextPeriod <= 5,
    });
  }

  const recipe = recipes.find((item) => item.category?.toLowerCase().includes(cycleInfo?.currentPhaseKey || ''));
  if (recipe) {
    notifications.push({
      id: `recipe-${recipe.id}`,
      title: 'Receta sugerida para tu fase',
      message: `${recipe.title} combina muy bien con tu fase actual y tus necesidades nutricionales.`,
      time: 'hoy',
      type: 'recipe',
      isNew: true,
    });
  }

  if (logs[0]) {
    notifications.push({
      id: `log-${logs[0].id}`,
      title: 'Tu último registro está guardado',
      message: `Estado de ánimo: ${logs[0].mood}. Síntomas registrados: ${logs[0].symptoms.length}.`,
      time: fromNow(logs[0].logged_at),
      type: 'log',
      isNew: false,
    });
  } else {
    notifications.push({
      id: 'log-reminder',
      title: 'Recuerda registrar tu día',
      message: 'Anotar síntomas, energía y sensaciones mejora la personalización de tus recomendaciones.',
      time: 'hoy',
      type: 'log',
      isNew: true,
    });
  }

  return notifications;
};
