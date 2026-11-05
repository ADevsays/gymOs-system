import { db } from '~~/server/lib/db';
import { plans, subscriptions, members } from '~~/drizzle/schema';
import { eq, and, count } from 'drizzle-orm';

export const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

const attachPlanMetadata = async (planList: any[]) => {
  return await Promise.all(
    planList.map(async (p) => {
      const activeCount = await db
        .select({ count: count() })
        .from(subscriptions)
        .innerJoin(members, eq(subscriptions.memberId, members.id))
        .where(
          and(
            eq(subscriptions.planId, p.id),
            eq(subscriptions.status, 'active'),
            eq(members.isArchived, false)
          )
        );

      const totalCount = await db
        .select({ count: count() })
        .from(subscriptions)
        .innerJoin(members, eq(subscriptions.memberId, members.id))
        .where(
          and(
            eq(subscriptions.planId, p.id),
            eq(members.isArchived, false)
          )
        );

      const baseSlug = slugify(p.name);
      return {
        ...p,
        slug: `${baseSlug}-${p.id}`,
        activeMembersCount: activeCount[0]?.count || 0,
        totalMembersCount: totalCount[0]?.count || 0,
      };
    })
  );
};

export const getActivePlans = async () => {
  const planList = await db.select().from(plans).where(eq(plans.isActive, true));
  return attachPlanMetadata(planList);
};

export const getAllPlans = async () => {
  const planList = await db.select().from(plans);
  return attachPlanMetadata(planList);
};

export const getPlanById = async (id: number) => {
  const planInfo = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
  return planInfo.length > 0 ? planInfo[0] : null;
};

export const getPlanDetailWithMembers = async (idOrSlug: string | number) => {
  let planId: number | null = null;

  if (typeof idOrSlug === 'number' || /^\d+$/.test(idOrSlug)) {
    planId = Number(idOrSlug);
  } else {
    // Slug format: "name-slug-ID"
    const match = idOrSlug.match(/-(\d+)$/);
    if (match) {
      planId = Number(match[1]);
    } else {
      // Fallback: search by name slug
      const all = await db.select().from(plans);
      const found = all.find((p) => slugify(p.name) === idOrSlug);
      if (found) planId = found.id;
    }
  }

  if (!planId) return null;

  const planInfo = await getPlanById(planId);
  if (!planInfo) return null;

  const baseSlug = slugify(planInfo.name);

  // Retrieve members in this plan
  const memberSubs = await db
    .select({
      member: members,
      subscription: subscriptions,
    })
    .from(subscriptions)
    .innerJoin(members, eq(subscriptions.memberId, members.id))
    .where(and(eq(subscriptions.planId, planId), eq(members.isArchived, false)));

  const formattedMembers = memberSubs.map((item) => ({
    id: item.member.id,
    firstName: item.member.firstName,
    lastName: item.member.lastName,
    cedula: item.member.cedula,
    phone: item.member.phone,
    email: item.member.email,
    photoPath: item.member.photoPath,
    subscriptionId: item.subscription.id,
    startDate: item.subscription.startDate,
    endDate: item.subscription.endDate,
    status: item.subscription.status,
    planPrice: item.subscription.planPrice,
  }));

  return {
    ...planInfo,
    slug: `${baseSlug}-${planInfo.id}`,
    activeMembersCount: formattedMembers.filter((m) => m.status === 'active').length,
    totalMembersCount: formattedMembers.length,
    members: formattedMembers,
  };
};

export const moveMemberToPlan = async (memberId: number, targetPlanId: number) => {
  const targetPlan = await getPlanById(targetPlanId);
  if (!targetPlan) {
    throw new Error('El plan de destino no existe');
  }

  // Find active subscription of member
  const currentSubs = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.memberId, memberId), eq(subscriptions.status, 'active')))
    .limit(1);

  if (currentSubs.length > 0) {
    const sub = currentSubs[0];
    await db
      .update(subscriptions)
      .set({
        planId: targetPlan.id,
        planName: targetPlan.name,
        planPrice: targetPlan.price,
      })
      .where(eq(subscriptions.id, sub.id));
  } else {
    // If no active subscription exists, create a new one
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + targetPlan.durationDays);

    await db.insert(subscriptions).values({
      memberId,
      planId: targetPlan.id,
      planName: targetPlan.name,
      planPrice: targetPlan.price,
      startDate: today.toISOString(),
      endDate: endDate.toISOString(),
      status: 'active',
    });
  }

  return { success: true, targetPlan };
};

export const createPlan = async (data: any) => {
  const result = await db.insert(plans).values(data).returning();
  return result[0];
};

export const updatePlan = async (id: number, data: any) => {
  const result = await db.update(plans).set(data).where(eq(plans.id, id)).returning();
  return result[0];
};

export const archivePlan = async (id: number) => {
  const result = await db.update(plans).set({ isActive: false }).where(eq(plans.id, id)).returning();
  return result[0];
};
