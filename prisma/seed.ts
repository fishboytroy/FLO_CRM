import {
  PrismaClient,
  Role,
  LeadType,
  PipelineStage,
  TaskStatus,
  ActivityType,
  OrganizationPlan,
  OrganizationStatus,
  SubscriptionStatus,
  MembershipRole
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { assertSeedCanRun } from "../lib/seed-safety";

const prisma = new PrismaClient();
const demoLeadEmails = [
  "claire.broussard@example.com",
  "michael.guidry@example.com",
  "tasha.landry@example.com",
  "andre.comeaux@example.com",
  "nolan.mouton@example.com"
];

async function main() {
  assertSeedCanRun();

  const passwordHash = await bcrypt.hash("Password123!", 12);

  const internalOrg = await prisma.organization.upsert({
    where: { slug: "lafayette-louisiana-real-estate" },
    update: {
      name: "Lafayette Louisiana Real Estate",
      plan: OrganizationPlan.internal,
      status: OrganizationStatus.active,
      subscriptionStatus: SubscriptionStatus.active
    },
    create: {
      id: "org_internal_lafayette",
      name: "Lafayette Louisiana Real Estate",
      slug: "lafayette-louisiana-real-estate",
      plan: OrganizationPlan.internal,
      status: OrganizationStatus.active,
      subscriptionStatus: SubscriptionStatus.active
    }
  });

  const individualOrg = await prisma.organization.upsert({
    where: { slug: "acadia-agent-membership" },
    update: {},
    create: {
      name: "Acadia Agent Membership",
      slug: "acadia-agent-membership",
      plan: OrganizationPlan.individual,
      status: OrganizationStatus.trialing,
      subscriptionStatus: SubscriptionStatus.trialing
    }
  });

  const teamOrg = await prisma.organization.upsert({
    where: { slug: "bayou-home-team" },
    update: {},
    create: {
      name: "Bayou Home Team",
      slug: "bayou-home-team",
      plan: OrganizationPlan.team,
      status: OrganizationStatus.trialing,
      subscriptionStatus: SubscriptionStatus.trialing
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@lafayettelouisianarealestate.com" },
    update: { role: Role.platform_admin },
    create: {
      name: "CRM Admin",
      email: "admin@lafayettelouisianarealestate.com",
      passwordHash,
      role: Role.platform_admin
    }
  });

  const agent = await prisma.user.upsert({
    where: { email: "agent@lafayettelouisianarealestate.com" },
    update: {},
    create: {
      name: "Lafayette Agent",
      email: "agent@lafayettelouisianarealestate.com",
      passwordHash,
      role: Role.agent
    }
  });

  const soloAgent = await prisma.user.upsert({
    where: { email: "solo.agent@example.com" },
    update: {},
    create: {
      name: "Solo Agent Member",
      email: "solo.agent@example.com",
      passwordHash,
      role: Role.agent
    }
  });

  const teamOwner = await prisma.user.upsert({
    where: { email: "team.owner@example.com" },
    update: {},
    create: {
      name: "Team Owner Member",
      email: "team.owner@example.com",
      passwordHash,
      role: Role.agent
    }
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: admin.id, organizationId: internalOrg.id } },
    update: { role: MembershipRole.owner },
    create: { userId: admin.id, organizationId: internalOrg.id, role: MembershipRole.owner }
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: agent.id, organizationId: internalOrg.id } },
    update: { role: MembershipRole.agent },
    create: { userId: agent.id, organizationId: internalOrg.id, role: MembershipRole.agent }
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: soloAgent.id, organizationId: individualOrg.id } },
    update: { role: MembershipRole.owner },
    create: { userId: soloAgent.id, organizationId: individualOrg.id, role: MembershipRole.owner }
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: teamOwner.id, organizationId: teamOrg.id } },
    update: { role: MembershipRole.owner },
    create: { userId: teamOwner.id, organizationId: teamOrg.id, role: MembershipRole.owner }
  });

  const leads = [
    {
      firstName: "Claire",
      organizationId: internalOrg.id,
      lastName: "Broussard",
      email: "claire.broussard@example.com",
      phone: "337-555-0181",
      leadType: LeadType.buyer,
      status: PipelineStage.qualified,
      source: "Website home search",
      assignedAgentId: agent.id,
      budgetMin: 280000,
      budgetMax: 420000,
      desiredLocation: "River Ranch, Lafayette",
      propertyInterest: "3 bed single-family home near schools",
      timeframe: "30-60 days",
      notes: "Pre-approved and wants a showing-heavy weekend schedule."
    },
    {
      firstName: "Michael",
      organizationId: internalOrg.id,
      lastName: "Guidry",
      email: "michael.guidry@example.com",
      phone: "337-555-0194",
      leadType: LeadType.seller,
      status: PipelineStage.appointment_set,
      source: "Home valuation request",
      assignedAgentId: admin.id,
      budgetMin: null,
      budgetMax: null,
      desiredLocation: "Broadmoor, Lafayette",
      propertyInterest: "Selling a 4 bed home",
      timeframe: "This quarter",
      notes: "Wants a CMA before listing after minor repairs."
    },
    {
      firstName: "Tasha",
      organizationId: internalOrg.id,
      lastName: "Landry",
      email: "tasha.landry@example.com",
      phone: "337-555-0167",
      leadType: LeadType.investor,
      status: PipelineStage.contacted,
      source: "Facebook ad",
      assignedAgentId: agent.id,
      budgetMin: 150000,
      budgetMax: 275000,
      desiredLocation: "Downtown Lafayette and Freetown-Port Rico",
      propertyInterest: "Duplexes and small multifamily",
      timeframe: "90 days",
      notes: "Cash buyer, asks for cap rate and rental comps."
    },
    {
      firstName: "Andre",
      organizationId: internalOrg.id,
      lastName: "Comeaux",
      email: "andre.comeaux@example.com",
      phone: "337-555-0133",
      leadType: LeadType.renter,
      status: PipelineStage.new_lead,
      source: "Rental inquiry",
      assignedAgentId: agent.id,
      budgetMin: 1200,
      budgetMax: 1800,
      desiredLocation: "Youngsville or south Lafayette",
      propertyInterest: "Townhome with garage",
      timeframe: "Immediate",
      notes: "Relocating for work and needs pet-friendly options."
    },
    {
      firstName: "Nolan",
      organizationId: internalOrg.id,
      lastName: "Mouton",
      email: "nolan.mouton@example.com",
      phone: "337-555-0128",
      leadType: LeadType.buyer,
      status: PipelineStage.offer_stage,
      source: "Agent referral",
      assignedAgentId: admin.id,
      budgetMin: 450000,
      budgetMax: 650000,
      desiredLocation: "Bendel Gardens",
      propertyInterest: "Updated home with pool",
      timeframe: "Under contract target this month",
      notes: "Ready to submit a competitive offer."
    }
  ];

  const existingDemoLeads = await prisma.lead.findMany({
    where: { organizationId: internalOrg.id, email: { in: demoLeadEmails } },
    select: { id: true }
  });
  const existingDemoLeadIds = existingDemoLeads.map((lead) => lead.id);

  if (existingDemoLeadIds.length) {
    await prisma.activity.deleteMany({ where: { leadId: { in: existingDemoLeadIds } } });
    await prisma.task.deleteMany({ where: { leadId: { in: existingDemoLeadIds } } });
  }

  const seededLeadIds: string[] = [];

  for (const data of leads) {
    const existingLead = await prisma.lead.findFirst({
      where: { organizationId: data.organizationId, email: data.email }
    });
    const lead = existingLead
      ? await prisma.lead.update({ where: { id: existingLead.id }, data })
      : await prisma.lead.create({ data });
    seededLeadIds.push(lead.id);
    await prisma.activity.create({
      data: {
        organizationId: internalOrg.id,
        leadId: lead.id,
        userId: data.assignedAgentId,
        type: ActivityType.lead_created,
        message: `Lead created from ${data.source}.`
      }
    });
  }

  const createdLeads = await prisma.lead.findMany({
    where: { id: { in: seededLeadIds } },
    orderBy: { createdAt: "asc" }
  });
  const today = new Date();
  today.setHours(11, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  await prisma.task.createMany({
    data: [
      {
        organizationId: internalOrg.id,
        leadId: createdLeads[0].id,
        assignedUserId: agent.id,
        title: "Send River Ranch showing list",
        description: "Include newest listings and school boundary notes.",
        dueDate: today,
        status: TaskStatus.pending
      },
      {
        organizationId: internalOrg.id,
        leadId: createdLeads[1].id,
        assignedUserId: admin.id,
        title: "Prepare Broadmoor valuation",
        description: "Pull comparable sales and suggested list range.",
        dueDate: today,
        status: TaskStatus.pending
      },
      {
        organizationId: internalOrg.id,
        leadId: createdLeads[2].id,
        assignedUserId: agent.id,
        title: "Send investor rental comps",
        description: "Focus on downtown Lafayette duplexes.",
        dueDate: yesterday,
        status: TaskStatus.pending
      },
      {
        organizationId: internalOrg.id,
        leadId: createdLeads[4].id,
        assignedUserId: admin.id,
        title: "Draft offer terms",
        description: "Confirm deposit, inspection timeline, and closing target.",
        dueDate: tomorrow,
        status: TaskStatus.pending
      }
    ]
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
