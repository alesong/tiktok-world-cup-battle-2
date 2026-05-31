import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_SETTINGS: { key: string; value: string }[] = [
  { key: 'admin_password', value: 'admin123' },
  { key: 'goal_distance_diamonds', value: '200' },
  { key: 'goal_distance_pixels', value: '600' },
  { key: 'match_mode', value: 'goals' },
  { key: 'match_limit', value: '3' },
  { key: 'volume', value: '0.5' },
  { key: 'event_multiplier', value: '1' },
  { key: 'event_gold_goal', value: 'false' },
  { key: 'event_penalty', value: 'none' },
  { key: 'event_turbo', value: 'false' },
  { key: 'local_team_id', value: 'ARG' },
  { key: 'visitor_team_id', value: 'BRA' },
  { key: 'local_score', value: '0' },
  { key: 'visitor_score', value: '0' },
  { key: 'ball_progress', value: '0' },
  { key: 'match_state', value: 'idle' },
  { key: 'overlay_resolution', value: '1920x1080' },
  { key: 'gift_values', value: '{"Rosa":1,"TikTok":1,"Perfume":20,"Corazon":5,"Sombrero":99,"Leon":29999,"Universo":34999}' },
  { key: 'player_scale', value: '100' },
  { key: 'ball_scale', value: '100' },
  { key: 'scoreboard_text_scale', value: '100' },
  { key: 'top_donors_count', value: '3' },
  { key: 'top_donors_display', value: 'list' },
  { key: 'speech_follow_text', value: 'también quiere entrar a la cancha' },
  { key: 'speech_gift_text', value: 'tiene la pelota' },
  { key: 'speech_goal_text', value: 'hizo gol' },
];

const DEFAULT_TEAMS: { id: string; name: string; flag: string; primaryColor: string; secondaryColor: string; jerseyColor: string }[] = [
  { id: 'ARG', name: 'Argentina', flag: '🇦🇷', primaryColor: '#74ACDF', secondaryColor: '#FFFFFF', jerseyColor: '#74ACDF' },
  { id: 'BRA', name: 'Brasil', flag: '🇧🇷', primaryColor: '#FEDF00', secondaryColor: '#009739', jerseyColor: '#FEDF00' },
  { id: 'COL', name: 'Colombia', flag: '🇨🇴', primaryColor: '#FCD116', secondaryColor: '#003893', jerseyColor: '#FCD116' },
  { id: 'FRA', name: 'Francia', flag: '🇫🇷', primaryColor: '#002395', secondaryColor: '#ED2939', jerseyColor: '#002395' },
  { id: 'ESP', name: 'España', flag: '🇪🇸', primaryColor: '#C60B1E', secondaryColor: '#F1BF00', jerseyColor: '#C60B1E' },
  { id: 'GER', name: 'Alemania', flag: '🇩🇪', primaryColor: '#000000', secondaryColor: '#DD0000', jerseyColor: '#FFFFFF' },
  { id: 'POR', name: 'Portugal', flag: '🇵🇹', primaryColor: '#046A38', secondaryColor: '#DA291C', jerseyColor: '#DA291C' },
  { id: 'ENG', name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', primaryColor: '#FFFFFF', secondaryColor: '#CF081F', jerseyColor: '#FFFFFF' },
  { id: 'URU', name: 'Uruguay', flag: '🇺🇾', primaryColor: '#007FFF', secondaryColor: '#FFFFFF', jerseyColor: '#007FFF' },
  { id: 'MEX', name: 'México', flag: '🇲🇽', primaryColor: '#006847', secondaryColor: '#C8102E', jerseyColor: '#006847' },
  { id: 'JPN', name: 'Japón', flag: '🇯🇵', primaryColor: '#00005F', secondaryColor: '#FFFFFF', jerseyColor: '#00005F' },
  { id: 'MAR', name: 'Marruecos', flag: '🇲🇦', primaryColor: '#C1272D', secondaryColor: '#006233', jerseyColor: '#C1272D' },
  { id: 'CHI', name: 'Chile', flag: '🇨🇱', primaryColor: '#D9252B', secondaryColor: '#0039A6', jerseyColor: '#FFFFFF' },
  { id: 'PER', name: 'Perú', flag: '🇵🇪', primaryColor: '#D91023', secondaryColor: '#FFFFFF', jerseyColor: '#FFFFFF' },
  { id: 'ECU', name: 'Ecuador', flag: '🇪🇨', primaryColor: '#FEDF00', secondaryColor: '#0039A6', jerseyColor: '#FEDF00' },
  { id: 'PAR', name: 'Paraguay', flag: '🇵🇾', primaryColor: '#D52B1E', secondaryColor: '#FFFFFF', jerseyColor: '#FFFFFF' },
  { id: 'BOL', name: 'Bolivia', flag: '🇧🇴', primaryColor: '#D52B1E', secondaryColor: '#FEDF00', jerseyColor: '#006847' },
  { id: 'VEN', name: 'Venezuela', flag: '🇻🇪', primaryColor: '#FEDF00', secondaryColor: '#0039A6', jerseyColor: '#D91023' },
  { id: 'CRC', name: 'Costa Rica', flag: '🇨🇷', primaryColor: '#D9252B', secondaryColor: '#0039A6', jerseyColor: '#FFFFFF' },
  { id: 'PAN', name: 'Panamá', flag: '🇵🇦', primaryColor: '#00529F', secondaryColor: '#D91023', jerseyColor: '#FFFFFF' },
  { id: 'HON', name: 'Honduras', flag: '🇭🇳', primaryColor: '#0077B6', secondaryColor: '#FFFFFF', jerseyColor: '#0077B6' },
  { id: 'SLV', name: 'El Salvador', flag: '🇸🇻', primaryColor: '#0039A6', secondaryColor: '#FFFFFF', jerseyColor: '#0039A6' },
  { id: 'GUA', name: 'Guatemala', flag: '🇬🇹', primaryColor: '#0066FF', secondaryColor: '#FFFFFF', jerseyColor: '#FFFFFF' },
  { id: 'NIC', name: 'Nicaragua', flag: '🇳🇮', primaryColor: '#0039A6', secondaryColor: '#FFFFFF', jerseyColor: '#0039A6' },
  { id: 'CUB', name: 'Cuba', flag: '🇨🇺', primaryColor: '#D52B1E', secondaryColor: '#0039A6', jerseyColor: '#FFFFFF' },
  { id: 'DOM', name: 'República Dominicana', flag: '🇩🇴', primaryColor: '#D52B1E', secondaryColor: '#0039A6', jerseyColor: '#FFFFFF' },
  { id: 'HAI', name: 'Haití', flag: '🇭🇹', primaryColor: '#D9252B', secondaryColor: '#0039A6', jerseyColor: '#D9252B' },
  { id: 'PRI', name: 'Puerto Rico', flag: '🇵🇷', primaryColor: '#D91023', secondaryColor: '#FFFFFF', jerseyColor: '#0039A6' },
];

async function main() {
  const settingCount = await prisma.twcSetting.count();
  if (settingCount === 0) {
    for (const s of DEFAULT_SETTINGS) {
      await prisma.twcSetting.upsert({
        where: { key: s.key },
        create: s,
        update: s,
      });
    }
    console.log(`Seeded ${DEFAULT_SETTINGS.length} settings.`);
  }

  // Always upsert all teams (adds missing countries without overwriting existing customizations)
  for (const t of DEFAULT_TEAMS) {
    const exists = await prisma.twcTeam.findUnique({ where: { id: t.id } });
    if (!exists) {
      await prisma.twcTeam.create({ data: t });
    }
  }
  const teamCount = await prisma.twcTeam.count();
  console.log(`Seeded ${DEFAULT_TEAMS.length} team definitions (${teamCount} total in DB).`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
