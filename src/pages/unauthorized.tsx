import React from 'react';
import { useRouter } from 'next/router';
import { AlertTriangle, ArrowLeft, Shield } from 'lucide-react';

/**
 * Pagina di accesso non autorizzato
 * Mostrata quando un utente tenta di accedere a funzioni riservate agli admin
 */
const UnauthorizedPage: React.FC = () => {
  const router = useRouter();
  const { reason } = router.query;

  const getErrorMessage = () => {
    switch (reason) {
      case 'admin_required':
        return {
          title: 'Accesso Riservato agli Amministratori',
          description: 'La sezione di gestione backup è accessibile solo agli utenti con privilegi di amministratore.',
          icon: <Shield className="w-16 h-16 text-red-500" />
        };
      default:
        return {
          title: 'Accesso Non Autorizzato',
          description: 'Non hai i permessi necessari per accedere a questa sezione.',
          icon: <AlertTriangle className="w-16 h-16 text-red-500" />
        };
    }
  };

  const errorInfo = getErrorMessage();

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* Icona di errore */}
            <div className="flex justify-center mb-6">
              {errorInfo.icon}
            </div>
            
            {/* Titolo */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {errorInfo.title}
            </h1>
            
            {/* Descrizione */}
            <p className="text-gray-600 mb-8">
              {errorInfo.description}
            </p>
            
            {/* Informazioni aggiuntive per admin_required */}
            {reason === 'admin_required' && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Shield className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Richiesta Accesso Amministratore
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Se ritieni di dover avere accesso a questa sezione, 
                        contatta l'amministratore di sistema per richiedere 
                        i privilegi necessari.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Pulsanti di azione */}
            <div className="space-y-3">
              <button
                onClick={handleGoBack}
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna Indietro
              </button>
              
              <button
                onClick={handleGoHome}
                className="w-full flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Vai alla Home
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer con informazioni di contatto */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Per assistenza tecnica o richieste di accesso, contatta l'amministratore di sistema.
        </p>
      </div>
    </div>
  );
};

export default UnauthorizedPage;