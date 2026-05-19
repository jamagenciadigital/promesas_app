const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe(`DELETE FROM reserva_escenario WHERE equipo_id IS NOT NULL AND equipo_id NOT IN (SELECT id FROM equipos)`);
  console.log("Deleted invalid rows in reserva_escenario");
}
main().catch(console.error).finally(() => prisma.$disconnect());
