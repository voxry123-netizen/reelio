import argon2 from "argon2";
import { prisma } from "./lib/prisma.js";
import { env } from "./lib/env.js";

async function main() {
  const email = env.ADMIN_SEED_EMAIL;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const passwordHash = await argon2.hash(env.ADMIN_SEED_PASSWORD);
    const admin = await prisma.user.create({
      data: { email, username: "admin", passwordHash, isVerified: true, identityScore: 100, reputationScore: 100 },
    });
    const realm = await prisma.realm.create({
      data: { slug: "welcome", name: "Welcome Realm", description: "Demo community", ownerUserId: admin.id },
    });
    await prisma.realmMember.create({ data: { realmId: realm.id, userId: admin.id, role: "owner" } });

    // demo post without media
    await prisma.post.create({
      data: { authorId: admin.id, realmId: realm.id, title: "Welcome to Reelio", caption: "Seed post", visibility: "public" },
    });
    console.log("Seeded admin + welcome realm");
  } else {
    console.log("Seed already exists");
  }
}
main().finally(async () => prisma.$disconnect());
