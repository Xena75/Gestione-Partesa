import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAccess } from '@/lib/auth';
import { getEmployeeLeaveBalance } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    // Verifica accesso utente
    const userCheck = await verifyUserAccess(request);
    if (!userCheck.success) {
      return NextResponse.json(
        { success: false, error: 'Accesso negato' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    // Se l'utente è employee, può vedere solo il proprio bilancio
    let targetUserId = userId;
    if (userCheck.user?.role === 'employee') {
      targetUserId = userCheck.user.id;
    }
    
    if (!targetUserId) {
      return NextResponse.json({
        success: false,
        error: 'ID utente non fornito'
      }, { status: 400 });
    }
    
    console.log('Recupero bilancio ferie per dipendente ID:', targetUserId);
    
    // Recupera il bilancio ferie del dipendente
    const leaveBalance = await getEmployeeLeaveBalance(targetUserId);
    
    console.log(`Bilancio ferie recuperato per dipendente ${targetUserId}:`, leaveBalance);
    
    return NextResponse.json({
      success: true,
      data: leaveBalance,
      message: 'Bilancio ferie recuperato con successo'
    });
    
  } catch (error) {
    console.error('Errore API employees/leave/balance GET:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero del bilancio ferie',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}