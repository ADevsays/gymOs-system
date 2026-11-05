import { db } from './server/lib/db';
import { members, plans, subscriptions, payments } from './drizzle/schema';
import { count } from 'drizzle-orm';

async function seed() {
  console.log('Seeding mock data...');
  try {
    const totalActiveMembers = await db.select({ cnt: count() }).from(members);
    console.log('Current members:', totalActiveMembers[0]?.cnt);

    const plan = await db.insert(plans).values({ 
      name: 'Plan Mensual Pro', 
      price: 95000, 
      maxUses: 30, 
      isActive: true,
      description: 'Acceso ilimitado' 
    }).returning();
    
    const m1 = await db.insert(members).values({ name: 'Juan Perez', email: 'juan@example.com', identification: '111', isActive: true, isArchived: false, joinDate: new Date().toISOString() }).returning();
    const m2 = await db.insert(members).values({ name: 'Maria Gomez', email: 'maria@example.com', identification: '222', isActive: true, isArchived: false, joinDate: new Date().toISOString() }).returning();
    const m3 = await db.insert(members).values({ name: 'Carlos Diaz', email: 'carlos@example.com', identification: '333', isActive: true, isArchived: false, joinDate: new Date().toISOString() }).returning();
    const m4 = await db.insert(members).values({ name: 'Ana Lopez', email: 'ana@example.com', identification: '444', isActive: true, isArchived: false, joinDate: new Date().toISOString() }).returning();

    const now = new Date().toISOString();
    const nextMonth = new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString();
    const pastMonth = new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString();
    const pastMonthEnd = new Date(new Date().setDate(new Date().getDate() - 20)).toISOString();

    await db.insert(subscriptions).values([
      { memberId: m1[0].id, planId: plan[0].id, planName: plan[0].name, planPrice: plan[0].price, startDate: now, endDate: nextMonth, status: 'active', remainingUses: 30 },
      { memberId: m2[0].id, planId: plan[0].id, planName: plan[0].name, planPrice: plan[0].price, startDate: now, endDate: nextMonth, status: 'active', remainingUses: 30 },
      { memberId: m3[0].id, planId: plan[0].id, planName: plan[0].name, planPrice: plan[0].price, startDate: now, endDate: nextMonth, status: 'active', remainingUses: 30 },
      { memberId: m4[0].id, planId: plan[0].id, planName: plan[0].name, planPrice: plan[0].price, startDate: pastMonth, endDate: pastMonthEnd, status: 'active', remainingUses: 0 }
    ]);

    await db.insert(payments).values([
      { memberId: m1[0].id, amount: 95000, paymentMethod: 'cash', paidAt: now, status: 'completed' },
      { memberId: m2[0].id, amount: 95000, paymentMethod: 'transfer', paidAt: now, status: 'completed' },
      { memberId: m3[0].id, amount: 95000, paymentMethod: 'card', paidAt: now, status: 'completed' }
    ]);
    console.log('Successfully seeded mock members and payments!');
  } catch(e) {
    console.error('Error seeding:', e);
  }
}
seed();
