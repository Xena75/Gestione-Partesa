#!/usr/bin/env node
/**
 * ============================================================================
 * Sistema di Notifiche Email per Backup
 * Sistema: Gestione Partesa
 * Funzione: Invio notifiche email per eventi backup
 * ============================================================================
 */

const nodemailer = require('nodemailer');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Configurazione
const CONFIG = {
    mysql: {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'your_password_here',
        database: 'backup_management'
    },
    email: {
        smtp: {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: 'your-email@gmail.com',
                pass: 'your-app-password'
            }
        },
        from: 'Sistema Backup Gestione Partesa <your-email@gmail.com>',
        recipients: {
            admin: ['admin@company.com'],
            technical: ['tech@company.com'],
            management: ['manager@company.com']
        }
    },
    notifications: {
        backup_success: {
            enabled: true,
            recipients: ['technical'],
            frequency: 'immediate'
        },
        backup_failure: {
            enabled: true,
            recipients: ['admin', 'technical'],
            frequency: 'immediate'
        },
        validation_issues: {
            enabled: true,
            recipients: ['technical'],
            frequency: 'immediate'
        },
        daily_summary: {
            enabled: true,
            recipients: ['admin'],
            frequency: 'daily',
            time: '08:00'
        },
        weekly_report: {
            enabled: true,
            recipients: ['admin', 'management'],
            frequency: 'weekly',
            day: 'monday',
            time: '09:00'
        },
        storage_warning: {
            enabled: true,
            recipients: ['admin', 'technical'],
            frequency: 'immediate',
            threshold: 80 // percentuale
        }
    },
    paths: {
        templates: path.join(__dirname, '..', 'config', 'email-templates'),
        logs: path.join(__dirname, '..', 'logs')
    }
};

// Classe principale per le notifiche email
class EmailNotifier {
    constructor() {
        this.transporter = null;
        this.connection = null;
    }

    /**
     * Inizializza il trasportatore email
     */
    async initEmailTransporter() {
        try {
            this.transporter = nodemailer.createTransporter(CONFIG.email.smtp);
            
            // Verifica la configurazione
            await this.transporter.verify();
            console.log('[INFO] Configurazione email verificata');
            return true;
        } catch (error) {
            console.error('[ERROR] Errore configurazione email:', error.message);
            return false;
        }
    }

    /**
     * Inizializza la connessione al database
     */
    async initDatabase() {
        try {
            this.connection = await mysql.createConnection(CONFIG.mysql);
            console.log('[INFO] Connessione database stabilita');
            return true;
        } catch (error) {
            console.error('[ERROR] Errore connessione database:', error.message);
            return false;
        }
    }

    /**
     * Chiude le connessioni
     */
    async cleanup() {
        if (this.connection) {
            await this.connection.end();
        }
        if (this.transporter) {
            this.transporter.close();
        }
    }

    /**
     * Ottiene la lista dei destinatari per un tipo di notifica
     */
    getRecipients(notificationType) {
        const config = CONFIG.notifications[notificationType];
        if (!config || !config.enabled) {
            return [];
        }

        const recipients = [];
        config.recipients.forEach(group => {
            if (CONFIG.email.recipients[group]) {
                recipients.push(...CONFIG.email.recipients[group]);
            }
        });

        return [...new Set(recipients)]; // Rimuovi duplicati
    }

    /**
     * Carica template email
     */
    loadEmailTemplate(templateName) {
        try {
            const templatePath = path.join(CONFIG.paths.templates, `${templateName}.html`);
            if (fs.existsSync(templatePath)) {
                return fs.readFileSync(templatePath, 'utf8');
            }
        } catch (error) {
            console.warn(`[WARNING] Errore caricamento template ${templateName}:`, error.message);
        }
        
        // Template di fallback
        return this.getDefaultTemplate();
    }

    /**
     * Template email di default
     */
    getDefaultTemplate() {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{subject}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background-color: #2563eb; color: white; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
        .content { line-height: 1.6; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        .success { color: #059669; }
        .error { color: #dc2626; }
        .warning { color: #d97706; }
        .info { color: #2563eb; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>{{title}}</h2>
        </div>
        <div class="content">
            {{content}}
        </div>
        <div class="footer">
            <p>Sistema di Backup Automatico - Gestione Partesa</p>
            <p>Generato il {{timestamp}}</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Sostituisce i placeholder nel template
     */
    replacePlaceholders(template, data) {
        let result = template;
        Object.keys(data).forEach(key => {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(placeholder, data[key] || '');
        });
        return result;
    }

    /**
     * Invia email
     */
    async sendEmail(to, subject, htmlContent, textContent = null) {
        try {
            const mailOptions = {
                from: CONFIG.email.from,
                to: Array.isArray(to) ? to.join(', ') : to,
                subject: subject,
                html: htmlContent,
                text: textContent || htmlContent.replace(/<[^>]*>/g, '') // Rimuovi HTML per testo
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`[INFO] Email inviata a ${mailOptions.to}: ${subject}`);
            
            // Log nel database
            if (this.connection) {
                await this.logEmailSent(mailOptions.to, subject, 'sent');
            }
            
            return true;
        } catch (error) {
            console.error('[ERROR] Errore invio email:', error.message);
            
            // Log errore nel database
            if (this.connection) {
                await this.logEmailSent(to, subject, 'failed', error.message);
            }
            
            return false;
        }
    }

    /**
     * Registra l'invio email nel database
     */
    async logEmailSent(recipients, subject, status, error = null) {
        try {
            const query = `
                INSERT INTO backup_logs (log_id, job_id, log_level, message, details, created_at)
                VALUES (UUID(), NULL, ?, ?, ?, NOW())
            `;
            
            const details = {
                type: 'email_notification',
                recipients: recipients,
                subject: subject,
                status: status,
                error: error
            };
            
            await this.connection.execute(query, [
                status === 'sent' ? 'INFO' : 'ERROR',
                `Email ${status}: ${subject}`,
                JSON.stringify(details)
            ]);
        } catch (dbError) {
            console.warn('[WARNING] Errore log email nel database:', dbError.message);
        }
    }

    /**
     * Notifica successo backup
     */
    async notifyBackupSuccess(jobData) {
        const recipients = this.getRecipients('backup_success');
        if (recipients.length === 0) return;

        const template = this.loadEmailTemplate('backup_success');
        const content = `
            <h3 class="success">✅ Backup Completato con Successo</h3>
            <p>Il backup è stato completato correttamente.</p>
            <table>
                <tr><th>Tipo Backup</th><td>${jobData.job_type}</td></tr>
                <tr><th>Database</th><td>${jobData.database_names}</td></tr>
                <tr><th>Dimensione</th><td>${this.formatBytes(jobData.total_size)}</td></tr>
                <tr><th>Durata</th><td>${this.formatDuration(jobData.start_time, jobData.end_time)}</td></tr>
                <tr><th>File Creati</th><td>${jobData.file_count}</td></tr>
            </table>
        `;

        const htmlContent = this.replacePlaceholders(template, {
            title: 'Backup Completato',
            subject: `Backup ${jobData.job_type} completato con successo`,
            content: content,
            timestamp: new Date().toLocaleString('it-IT')
        });

        await this.sendEmail(
            recipients,
            `[BACKUP SUCCESS] ${jobData.job_type} - ${jobData.database_names}`,
            htmlContent
        );
    }

    /**
     * Notifica fallimento backup
     */
    async notifyBackupFailure(jobData, error) {
        const recipients = this.getRecipients('backup_failure');
        if (recipients.length === 0) return;

        const template = this.loadEmailTemplate('backup_failure');
        const content = `
            <h3 class="error">❌ Backup Fallito</h3>
            <p><strong>ATTENZIONE:</strong> Il backup non è stato completato correttamente.</p>
            <table>
                <tr><th>Tipo Backup</th><td>${jobData.job_type}</td></tr>
                <tr><th>Database</th><td>${jobData.database_names}</td></tr>
                <tr><th>Errore</th><td class="error">${error}</td></tr>
                <tr><th>Ora Inizio</th><td>${jobData.start_time}</td></tr>
            </table>
            <p><strong>Azione Richiesta:</strong> Verificare i log e ripetere il backup manualmente.</p>
        `;

        const htmlContent = this.replacePlaceholders(template, {
            title: 'Backup Fallito',
            subject: `ERRORE: Backup ${jobData.job_type} fallito`,
            content: content,
            timestamp: new Date().toLocaleString('it-IT')
        });

        await this.sendEmail(
            recipients,
            `[BACKUP ERROR] ${jobData.job_type} - ${jobData.database_names}`,
            htmlContent
        );
    }

    /**
     * Notifica problemi di validazione
     */
    async notifyValidationIssues(validationResults) {
        const recipients = this.getRecipients('validation_issues');
        if (recipients.length === 0) return;

        const template = this.loadEmailTemplate('validation_issues');
        const content = `
            <h3 class="warning">⚠️ Problemi di Validazione Backup</h3>
            <p>Sono stati rilevati problemi durante la validazione dei backup.</p>
            <table>
                <tr><th>File Totali</th><td>${validationResults.totalFiles}</td></tr>
                <tr><th>File Validi</th><td class="success">${validationResults.validFiles}</td></tr>
                <tr><th>File Corrotti</th><td class="error">${validationResults.corruptFiles}</td></tr>
                <tr><th>File Mancanti</th><td class="error">${validationResults.missingFiles}</td></tr>
            </table>
            ${validationResults.errors.length > 0 ? `
                <h4>Errori Rilevati:</h4>
                <ul>
                    ${validationResults.errors.map(error => `<li class="error">${error}</li>`).join('')}
                </ul>
            ` : ''}
        `;

        const htmlContent = this.replacePlaceholders(template, {
            title: 'Problemi Validazione Backup',
            subject: 'Problemi rilevati nella validazione backup',
            content: content,
            timestamp: new Date().toLocaleString('it-IT')
        });

        await this.sendEmail(
            recipients,
            '[BACKUP WARNING] Problemi validazione rilevati',
            htmlContent
        );
    }

    /**
     * Genera e invia report giornaliero
     */
    async sendDailySummary() {
        const recipients = this.getRecipients('daily_summary');
        if (recipients.length === 0) return;

        try {
            // Ottieni statistiche ultime 24 ore
            const [jobs] = await this.connection.execute(`
                SELECT 
                    job_type,
                    status,
                    COUNT(*) as count,
                    SUM(total_size) as total_size
                FROM backup_jobs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                GROUP BY job_type, status
            `);

            const [alerts] = await this.connection.execute(`
                SELECT COUNT(*) as count
                FROM backup_logs 
                WHERE log_level = 'ERROR' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);

            const template = this.loadEmailTemplate('daily_summary');
            let jobsTable = '<table><tr><th>Tipo</th><th>Status</th><th>Conteggio</th><th>Dimensione</th></tr>';
            
            jobs.forEach(job => {
                jobsTable += `<tr><td>${job.job_type}</td><td>${job.status}</td><td>${job.count}</td><td>${this.formatBytes(job.total_size || 0)}</td></tr>`;
            });
            jobsTable += '</table>';

            const content = `
                <h3 class="info">📊 Riepilogo Giornaliero Backup</h3>
                <p>Attività backup delle ultime 24 ore:</p>
                ${jobsTable}
                <p><strong>Errori rilevati:</strong> ${alerts[0].count}</p>
            `;

            const htmlContent = this.replacePlaceholders(template, {
                title: 'Riepilogo Giornaliero Backup',
                subject: 'Riepilogo giornaliero backup',
                content: content,
                timestamp: new Date().toLocaleString('it-IT')
            });

            await this.sendEmail(
                recipients,
                `[BACKUP DAILY] Riepilogo ${new Date().toLocaleDateString('it-IT')}`,
                htmlContent
            );
        } catch (error) {
            console.error('[ERROR] Errore generazione report giornaliero:', error.message);
        }
    }

    /**
     * Genera e invia report settimanale
     */
    async sendWeeklyReport() {
        const recipients = this.getRecipients('weekly_report');
        if (recipients.length === 0) return;

        try {
            // Ottieni statistiche ultima settimana
            const [summary] = await this.connection.execute(`
                SELECT 
                    COUNT(*) as total_jobs,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_jobs,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs,
                    SUM(total_size) as total_size,
                    AVG(TIMESTAMPDIFF(MINUTE, start_time, end_time)) as avg_duration
                FROM backup_jobs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            `);

            const [byType] = await this.connection.execute(`
                SELECT 
                    job_type,
                    COUNT(*) as count,
                    SUM(total_size) as size
                FROM backup_jobs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND status = 'completed'
                GROUP BY job_type
            `);

            const template = this.loadEmailTemplate('weekly_report');
            
            let typeTable = '<table><tr><th>Tipo Backup</th><th>Conteggio</th><th>Dimensione Totale</th></tr>';
            byType.forEach(type => {
                typeTable += `<tr><td>${type.job_type}</td><td>${type.count}</td><td>${this.formatBytes(type.size || 0)}</td></tr>`;
            });
            typeTable += '</table>';

            const stats = summary[0];
            const successRate = stats.total_jobs > 0 ? ((stats.successful_jobs / stats.total_jobs) * 100).toFixed(1) : 0;

            const content = `
                <h3 class="info">📈 Report Settimanale Backup</h3>
                <p>Statistiche backup degli ultimi 7 giorni:</p>
                <table>
                    <tr><th>Backup Totali</th><td>${stats.total_jobs}</td></tr>
                    <tr><th>Backup Riusciti</th><td class="success">${stats.successful_jobs}</td></tr>
                    <tr><th>Backup Falliti</th><td class="error">${stats.failed_jobs}</td></tr>
                    <tr><th>Tasso di Successo</th><td>${successRate}%</td></tr>
                    <tr><th>Dimensione Totale</th><td>${this.formatBytes(stats.total_size || 0)}</td></tr>
                    <tr><th>Durata Media</th><td>${Math.round(stats.avg_duration || 0)} minuti</td></tr>
                </table>
                <h4>Backup per Tipo:</h4>
                ${typeTable}
            `;

            const htmlContent = this.replacePlaceholders(template, {
                title: 'Report Settimanale Backup',
                subject: 'Report settimanale backup',
                content: content,
                timestamp: new Date().toLocaleString('it-IT')
            });

            await this.sendEmail(
                recipients,
                `[BACKUP WEEKLY] Report settimana ${new Date().toLocaleDateString('it-IT')}`,
                htmlContent
            );
        } catch (error) {
            console.error('[ERROR] Errore generazione report settimanale:', error.message);
        }
    }

    /**
     * Formatta i bytes in formato leggibile
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Formatta la durata tra due timestamp
     */
    formatDuration(startTime, endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const diffMs = end - start;
        const diffMins = Math.round(diffMs / 60000);
        
        if (diffMins < 60) {
            return `${diffMins} minuti`;
        } else {
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            return `${hours}h ${mins}m`;
        }
    }
}

// Funzioni di utilità per chiamate esterne
async function notifyBackupEvent(eventType, data) {
    const notifier = new EmailNotifier();
    
    try {
        await notifier.initEmailTransporter();
        await notifier.initDatabase();
        
        switch (eventType) {
            case 'success':
                await notifier.notifyBackupSuccess(data);
                break;
            case 'failure':
                await notifier.notifyBackupFailure(data.job, data.error);
                break;
            case 'validation':
                await notifier.notifyValidationIssues(data);
                break;
            case 'daily':
                await notifier.sendDailySummary();
                break;
            case 'weekly':
                await notifier.sendWeeklyReport();
                break;
            default:
                console.error('[ERROR] Tipo evento non riconosciuto:', eventType);
        }
    } catch (error) {
        console.error('[ERROR] Errore invio notifica:', error.message);
    } finally {
        await notifier.cleanup();
    }
}

// Funzione principale per uso da riga di comando
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Uso: node email-notifier.js <tipo> [dati]');
        console.log('Tipi disponibili: success, failure, validation, daily, weekly');
        process.exit(1);
    }
    
    const eventType = args[0];
    let data = {};
    
    if (args[1]) {
        try {
            data = JSON.parse(args[1]);
        } catch (error) {
            console.error('[ERROR] Dati JSON non validi:', error.message);
            process.exit(1);
        }
    }
    
    await notifyBackupEvent(eventType, data);
}

// Esegui se chiamato direttamente
if (require.main === module) {
    main().catch(error => {
        console.error('[FATAL] Errore fatale:', error.message);
        process.exit(1);
    });
}

module.exports = { EmailNotifier, notifyBackupEvent };