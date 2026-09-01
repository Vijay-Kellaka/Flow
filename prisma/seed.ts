import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main(){
  const email='demo@flow.local';
  const u=await prisma.user.upsert({where:{email},create:{email,name:'Demo User',emailVerified:new Date()},update:{}});
  await prisma.dashboard.upsert({where:{userId:u.id},create:{userId:u.id,layout:[{id:'tasks',type:'tasks',size:'medium',visible:true,config:{}},{id:'expenses',type:'expenses',size:'medium',visible:true,config:{range:'today'}},{id:'goals',type:'goals',size:'medium',visible:true,config:{}},{id:'journal',type:'journal',size:'medium',visible:true,config:{}},{id:'activity',type:'activity',size:'large',visible:true,config:{}}]},update:{}});
}
main().finally(()=>prisma.$disconnect());
