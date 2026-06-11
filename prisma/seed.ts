import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 시드 데이터 생성 시작...\n');

  // 1. 회사 + 관리자 생성
  const company = await prisma.company.create({
    data: {
      name: '테크스타터',
      inviteCode: 'TECH01',
      domain: 'techstarter.co.kr',
      maxMembers: 200,
      plan: 'PRO',
      admin: {
        create: {
          email: 'admin@techstarter.co.kr',
          name: '최서연',
          phone: '010-0000-0001',
          provider: 'KAKAO',
          providerId: 'kakao_admin',
          role: 'ADMIN',
          employeeId: 'TS-001',
        },
      },
    },
  });

  console.log(`✅ 회사: ${company.name} (${company.id})`);

  // 2. 차주 생성
  const driver = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'driver@techstarter.co.kr',
      name: '박준서',
      phone: '010-0000-0002',
      provider: 'GOOGLE',
      providerId: 'google_driver',
      role: 'DRIVER',
      employeeId: 'TS-035',
      rating: 4.8,
      rideCount: 42,
      vehicles: {
        create: {
          model: '아반떼',
          color: '흰색',
          plate: '12가 3456',
          capacity: 4,
        },
      },
    },
  });

  console.log(`✅ 차주: ${driver.name} (${driver.id})`);

  // 3. 탑승자 생성
  const passenger = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'passenger@techstarter.co.kr',
      name: '김도윤',
      phone: '010-0000-0003',
      provider: 'KAKAO',
      providerId: 'kakao_passenger',
      role: 'PASSENGER',
      employeeId: 'TS-042',
    },
  });

  console.log(`✅ 탑승자: ${passenger.name} (${passenger.id})`);

  // 4. 초대 코드 생성
  const inviteCode = await prisma.inviteCode.create({
    data: {
      companyId: company.id,
      code: 'ABC123',
      createdBy: company.adminId,
      maxUses: 10,
    },
  });

  console.log(`✅ 초대 코드: ${inviteCode.code}`);

  // 5. 샘플 카풀 생성
  const ride = await prisma.ride.create({
    data: {
      companyId: company.id,
      driverId: driver.id,
      departureLat: 37.4979,
      departureLng: 127.0276,
      departureAddr: '강남역',
      arrivalLat: 37.2636,
      arrivalLng: 127.0286,
      arrivalAddr: '수원역',
      departureTime: new Date(Date.now() + 86400000),
      availableSeats: 3,
      fare: 5000,
      recurringDays: 'MON,TUE,WED,THU,FRI',
      preferences: { noSmoking: true },
      status: 'OPEN',
    },
  });

  console.log(`✅ 카풀: ${ride.departureAddr} → ${ride.arrivalAddr}`);

  // 6. 채팅방 생성
  const chatRoom = await prisma.chatRoom.create({
    data: {
      rideId: ride.id,
    },
  });

  console.log(`✅ 채팅방: ${chatRoom.id}`);

  console.log('\n🎉 시드 데이터 생성 완료!');
}

main()
  .catch((e) => {
    console.error('❌ 시드 에러:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
