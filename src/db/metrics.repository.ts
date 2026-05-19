import { prisma } from "./prisma";

/**
 * Métricas de uso do app — alimentam o painel privado em /admin.html.
 * São números agregados (contagens), sem expor dados pessoais de usuários.
 */
export interface AppMetrics {
  totalUsers: number;
  totalWardrobeItems: number;
  totalOutfits: number;
  /** Usuários que cadastraram pelo menos 1 peça (ativação). */
  usersWithWardrobe: number;
  /** % de usuários ativados (usersWithWardrobe / totalUsers). */
  activationRate: number;
  signupsLast7Days: number;
  wardrobeItemsLast7Days: number;
  outfitsLast7Days: number;
  /** Usuários que cadastraram peça ou geraram look nos últimos 7 dias. */
  activeUsersLast7Days: number;
  generatedAt: string;
}

export async function getAppMetrics(): Promise<AppMetrics> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalWardrobeItems,
    totalOutfits,
    signupsLast7Days,
    wardrobeItemsLast7Days,
    outfitsLast7Days,
    wardrobeUserGroups,
    activeWardrobeGroups,
    activeOutfitGroups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.wardrobeItem.count(),
    prisma.outfit.count(),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.wardrobeItem.count({ where: { createdAt: { gte: since } } }),
    prisma.outfit.count({ where: { createdAt: { gte: since } } }),
    prisma.wardrobeItem.groupBy({ by: ["userId"] }),
    prisma.wardrobeItem.groupBy({ by: ["userId"], where: { createdAt: { gte: since } } }),
    prisma.outfit.groupBy({ by: ["userId"], where: { createdAt: { gte: since } } }),
  ]);

  const usersWithWardrobe = wardrobeUserGroups.length;
  const activeUserIds = new Set<string>([
    ...activeWardrobeGroups.map((g) => g.userId),
    ...activeOutfitGroups.map((g) => g.userId),
  ]);

  return {
    totalUsers,
    totalWardrobeItems,
    totalOutfits,
    usersWithWardrobe,
    activationRate: totalUsers > 0 ? Math.round((usersWithWardrobe / totalUsers) * 100) : 0,
    signupsLast7Days,
    wardrobeItemsLast7Days,
    outfitsLast7Days,
    activeUsersLast7Days: activeUserIds.size,
    generatedAt: new Date().toISOString(),
  };
}
