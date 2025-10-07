import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Pool di connessioni per migliori performance
const pool = mysql.createPool({
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASSWORD || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// GET - Statistiche fatturazione preventivi
export async function GET(request: NextRequest) {
  let connection: any = null;
  
  try {
    connection = await pool.getConnection();

    // Query per le statistiche generali
    const statsQuery = `
      SELECT 
        COUNT(*) as total_quotes,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_quotes,
        COUNT(CASE WHEN invoice_status = 'pending' THEN 1 END) as pending_invoices,
        COUNT(CASE WHEN invoice_status = 'invoiced' THEN 1 END) as invoiced_quotes,
        COUNT(CASE WHEN invoice_status = 'paid' THEN 1 END) as paid_quotes,
        COUNT(CASE WHEN invoice_status = 'cancelled' THEN 1 END) as cancelled_invoices,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_approved_amount,
        SUM(CASE WHEN invoice_amount IS NOT NULL THEN invoice_amount ELSE 0 END) as total_invoiced_amount,
        AVG(CASE WHEN invoice_amount IS NOT NULL AND amount > 0 THEN 
          ABS(invoice_amount - amount) / amount * 100 
        END) as avg_discrepancy_percentage
      FROM maintenance_quotes
      WHERE status IN ('approved', 'completed')
    `;

    const [statsResult] = await connection.execute(statsQuery);
    const stats = (statsResult as any[])[0];

    // Query per le discrepanze
    const discrepanciesQuery = `
      SELECT 
        COUNT(CASE WHEN invoice_amount IS NOT NULL AND amount > 0 AND 
          ABS(invoice_amount - amount) / amount * 100 > 10 THEN 1 END) as high_discrepancies,
        COUNT(CASE WHEN invoice_amount IS NOT NULL AND amount > 0 AND 
          ABS(invoice_amount - amount) / amount * 100 BETWEEN 1 AND 10 THEN 1 END) as medium_discrepancies,
        COUNT(CASE WHEN invoice_amount IS NOT NULL AND amount > 0 AND 
          ABS(invoice_amount - amount) / amount * 100 <= 1 THEN 1 END) as low_discrepancies,
        COUNT(CASE WHEN invoice_amount IS NOT NULL AND amount > 0 THEN 1 END) as total_with_invoice_amount
      FROM maintenance_quotes
      WHERE status IN ('approved', 'completed') AND invoice_amount IS NOT NULL
    `;

    const [discrepanciesResult] = await connection.execute(discrepanciesQuery);
    const discrepancies = (discrepanciesResult as any[])[0];

    // Query per i trend mensili (ultimi 6 mesi)
    const trendsQuery = `
      SELECT 
        DATE_FORMAT(invoice_date, '%Y-%m') as month,
        COUNT(*) as invoices_count,
        SUM(invoice_amount) as total_amount,
        AVG(CASE WHEN amount > 0 THEN 
          ABS(invoice_amount - amount) / amount * 100 
        END) as avg_discrepancy
      FROM maintenance_quotes
      WHERE invoice_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        AND invoice_amount IS NOT NULL
      GROUP BY DATE_FORMAT(invoice_date, '%Y-%m')
      ORDER BY month DESC
    `;

    const [trendsResult] = await connection.execute(trendsQuery);

    // Query per i fornitori con più discrepanze
    const suppliersQuery = `
      SELECT 
        s.name as supplier_name,
        COUNT(*) as total_quotes,
        COUNT(CASE WHEN invoice_amount IS NOT NULL THEN 1 END) as invoiced_quotes,
        AVG(CASE WHEN invoice_amount IS NOT NULL AND mq.amount > 0 THEN 
          ABS(invoice_amount - mq.amount) / mq.amount * 100 
        END) as avg_discrepancy_percentage,
        SUM(CASE WHEN invoice_amount IS NOT NULL AND mq.amount > 0 AND 
          ABS(invoice_amount - mq.amount) / mq.amount * 100 > 10 THEN 1 ELSE 0 END) as high_discrepancies
      FROM maintenance_quotes mq
      JOIN suppliers s ON mq.supplier_id = s.id
      WHERE mq.status IN ('approved', 'completed')
      GROUP BY s.id, s.name
      HAVING invoiced_quotes > 0
      ORDER BY avg_discrepancy_percentage DESC
      LIMIT 10
    `;

    const [suppliersResult] = await connection.execute(suppliersQuery);

    connection.release();

    // Calcola percentuali per le discrepanze
    const totalWithInvoice = discrepancies.total_with_invoice_amount || 1;
    const discrepancyPercentages = {
      high: Math.round((discrepancies.high_discrepancies / totalWithInvoice) * 100),
      medium: Math.round((discrepancies.medium_discrepancies / totalWithInvoice) * 100),
      low: Math.round((discrepancies.low_discrepancies / totalWithInvoice) * 100)
    };

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total_quotes: stats.total_quotes || 0,
          approved_quotes: stats.approved_quotes || 0,
          pending_invoices: stats.pending_invoices || 0,
          invoiced_quotes: stats.invoiced_quotes || 0,
          paid_quotes: stats.paid_quotes || 0,
          cancelled_invoices: stats.cancelled_invoices || 0,
          total_approved_amount: parseFloat(stats.total_approved_amount || 0),
          total_invoiced_amount: parseFloat(stats.total_invoiced_amount || 0),
          avg_discrepancy_percentage: parseFloat(stats.avg_discrepancy_percentage || 0)
        },
        discrepancies: {
          high_discrepancies: discrepancies.high_discrepancies || 0,
          medium_discrepancies: discrepancies.medium_discrepancies || 0,
          low_discrepancies: discrepancies.low_discrepancies || 0,
          total_with_invoice: totalWithInvoice,
          percentages: discrepancyPercentages
        },
        trends: trendsResult || [],
        suppliers: suppliersResult || []
      }
    });

  } catch (error) {
    console.error('Errore nel recupero statistiche fatturazione:', error);
    if (connection) {
      connection.release();
    }
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero delle statistiche' },
      { status: 500 }
    );
  }
}