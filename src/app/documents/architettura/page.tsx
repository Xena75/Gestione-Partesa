'use client';

import { useState, useEffect } from 'react';
import { Settings, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '@/contexts/ThemeContext';

export default function ArchitetturaPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { theme } = useTheme();

  useEffect(() => {
    const loadDocument = async () => {
      try {
        const response = await fetch('/api/documents/architettura');
        if (!response.ok) {
          throw new Error('Documento non trovato');
        }
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError('Errore nel caricamento del documento');
        console.error('Errore:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-red-800 dark:text-red-200 text-lg font-semibold mb-2">Errore</h2>
            <p className="text-red-600 dark:text-red-300">{error}</p>
            <Link href="/dashboard" className="inline-flex items-center mt-4 text-blue-600 dark:text-blue-400 hover:underline">
              <ArrowLeft size={16} className="mr-1" />
              Torna alla Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-4">
            <ArrowLeft size={16} className="mr-1" />
            Torna alla Dashboard
          </Link>
          <div className="flex items-center mb-2">
            <Settings size={24} className="text-blue-600 dark:text-blue-400 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Architettura Tecnica</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Documentazione dell'architettura tecnica del sistema Gestione Partesa</p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="prose dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-white prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-pre:bg-gray-100 dark:prose-pre:bg-gray-700">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}