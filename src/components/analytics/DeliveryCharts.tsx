// src/components/analytics/DeliveryCharts.tsx
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieChartIcon, Calendar, Truck } from 'lucide-react';
import VettoriTableBootstrap from './VettoriTableBootstrap';
import ChartWrapper from './ChartWrapper';

interface TimeSeriesData {
  date: string;
  rawDate: string;
  consegne: number;
  colli: number;
  fatturato: number;
  type: string;
  period: number;
}

interface AllVettoriData {
  id: number;
  nome: string;
  consegne: number;
  colli: number;
  fatturato: number;
  percentuale: number;
  fatturatoMedio: number;
  colliMedio: number;
  giorniAttivi: number;
  efficienza: number;
  rank: number;
}

interface RipartizioneData {
  name: string;
  value: number;
  percentage: number;
  color?: string;
}

interface TopClientiData {
  nome: string;
  consegne: number;
  colli: number;
  fatturato: number;
}

interface DeliveryChartsProps {
  timeSeriesData: TimeSeriesData[];
  allVettori: AllVettoriData[];
  ripartizioneTipologie: RipartizioneData[];
  topClienti: TopClientiData[];
  ripartizioneDepositi: RipartizioneData[];
  loading?: boolean;
}

// Componente Skeleton per loading
function ChartSkeleton() {
  return (
    <div className="h-80 bg-gray-100 rounded animate-pulse flex items-center justify-center">
      <div className="text-gray-400">Caricamento grafico...</div>
    </div>
  );
}

// Custom Tooltip per i grafici
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {
              entry.name.includes('Fatturato') || entry.name.includes('€') 
                ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(entry.value)
                : new Intl.NumberFormat('it-IT').format(entry.value)
            }
          </p>
        ))}
      </div>
    );
  }
  return null;
}

// Grafico serie temporale
function TimeSeriesChart({ data, loading }: { data: TimeSeriesData[]; loading: boolean }) {
  if (loading) return <ChartSkeleton />;
  
  // Controlla se data è null o undefined
  const safeData = data || [];
  
  if (safeData.length === 0) {
    return (
      <Card className="p-6 bg-white shadow-sm border-0">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Andamento Temporale</h3>
        </div>
        <div className="h-80 flex items-center justify-center text-gray-500">
          Nessun dato disponibile per il periodo selezionato
        </div>
      </Card>
    );
  }

  // I dati arrivano già formattati dall'API
  const chartData = safeData;
  
  // Determina il tipo di aggregazione e titolo
  const getAggregationInfo = () => {
    if (safeData.length === 0) return { title: 'Andamento Temporale', subtitle: '' };
    
    const firstItem = safeData[0];
    const period = firstItem.period || 30;
    
    if (firstItem.type === 'daily') {
      return { 
        title: 'Andamento Giornaliero', 
        subtitle: `Ultimi ${period} giorni` 
      };
    } else if (firstItem.type === 'weekly') {
      return { 
        title: 'Andamento Settimanale', 
        subtitle: `${Math.ceil(period/7)} settimane (${period} giorni)` 
      };
    } else {
      return { 
        title: 'Andamento Mensile', 
        subtitle: `${Math.ceil(period/30)} mesi (${period} giorni)` 
      };
    }
  };
  
  const { title, subtitle } = getAggregationInfo();

  const getBadgeText = () => {
    if (safeData.length === 0) return '';
    if (safeData[0].type === 'daily') return '📅 Vista Giornaliera';
    if (safeData[0].type === 'weekly') return '📊 Vista Settimanale';
    if (safeData[0].type === 'monthly') return '📈 Vista Mensile';
    return '';
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <YAxis 
            yAxisId="left"
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <YAxis 
            yAxisId="right" 
            orientation="right"
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="consegne"
            stroke="#3B82F6"
            strokeWidth={3}
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            name="Consegne"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="colli"
            stroke="#10B981"
            strokeWidth={3}
            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            name="Colli"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="fatturato"
            stroke="#F59E0B"
            strokeWidth={3}
            dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
            name="Fatturato €"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Componente TopVettoriChart rimosso - sostituito con VettoriTableInteractive

// Grafico torta Tipologie
function TipologieChart({ data, loading }: { data: RipartizioneData[]; loading: boolean }) {
  if (loading) return <ChartSkeleton />;

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Non mostrare label per fette < 5%
    
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry: any) => (
              <span style={{ color: entry.color }}>
                {value} ({entry.payload.percentage.toFixed(1)}%)
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Grafico barre Top Clienti
function TopClientiChart({ data, loading }: { data: TopClientiData[]; loading: boolean }) {
  if (loading) return <ChartSkeleton />;

  const safeData = data || [];
  if (safeData.length === 0) {
    return (
      <Card className="p-6 bg-white shadow-sm border-0">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-800">Top 8 Clienti per Fatturato</h3>
        </div>
        <div className="h-80 flex items-center justify-center text-gray-500">
          Nessun dato disponibile
        </div>
      </Card>
    );
  }

  const chartData = safeData.slice(0, 8).map(item => ({
    ...item,
    nome: item.nome.length > 25 ? item.nome.substring(0, 22) + '...' : item.nome,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="nome"
            tick={{ fontSize: 10 }}
            stroke="#666"
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="fatturato" 
            fill="#8B5CF6"
            name="Fatturato €"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DeliveryCharts({
  timeSeriesData,
  allVettori,
  ripartizioneTipologie,
  topClienti,
  ripartizioneDepositi,
  loading
}: DeliveryChartsProps) {
  const getTimeSeriesInfo = () => {
    if (timeSeriesData.length === 0) return { title: 'Andamento Temporale', subtitle: '' };
    
    const firstItem = timeSeriesData[0];
    const period = firstItem.period || 30;
    
    if (firstItem.type === 'daily') {
      return { 
        title: 'Andamento Giornaliero', 
        subtitle: `Ultimi ${period} giorni - ${getBadgeText()}` 
      };
    } else if (firstItem.type === 'weekly') {
      return { 
        title: 'Andamento Settimanale', 
        subtitle: `${Math.ceil(period/7)} settimane (${period} giorni) - ${getBadgeText()}` 
      };
    } else {
      return { 
        title: 'Andamento Mensile', 
        subtitle: `${Math.ceil(period/30)} mesi (${period} giorni) - ${getBadgeText()}` 
      };
    }
  };

  const getBadgeText = () => {
    if (timeSeriesData.length === 0) return '';
    if (timeSeriesData[0].type === 'daily') return 'Vista Giornaliera';
    if (timeSeriesData[0].type === 'weekly') return 'Vista Settimanale';
    if (timeSeriesData[0].type === 'monthly') return 'Vista Mensile';
    return '';
  };

  const { title: timeSeriesTitle, subtitle: timeSeriesSubtitle } = getTimeSeriesInfo();

  return (
    <div className="row g-4">
      {/* Prima riga - Andamento temporale */}
      <div className="col-12">
        <ChartWrapper
          title={timeSeriesTitle}
          subtitle={timeSeriesSubtitle}
          icon={<TrendingUp className="text-primary" size={20} />}
          chartId="timeseries"
          defaultVisible={true}
        >
          <TimeSeriesChart data={timeSeriesData} loading={loading} />
        </ChartWrapper>
      </div>

      {/* Seconda riga - Tabella vettori e grafico tipologie */}
      <div className="col-lg-6">
        <ChartWrapper
          title="Performance Tutti i Vettori"
          subtitle={`${allVettori.length} vettori analizzati`}
          icon={<Truck className="text-success" size={20} />}
          chartId="vettori"
          defaultVisible={true}
        >
          <VettoriTableBootstrap data={allVettori} loading={loading} />
        </ChartWrapper>
      </div>
      
      <div className="col-lg-6">
        <ChartWrapper
          title="Ripartizione per Tipologia"
          subtitle="Distribuzione fatturato per tipo servizio"
          icon={<PieChartIcon className="text-warning" size={20} />}
          chartId="tipologie"
          defaultVisible={true}
        >
          <TipologieChart data={ripartizioneTipologie} loading={loading} />
        </ChartWrapper>
      </div>

      {/* Terza riga - Top clienti e depositi */}
      <div className="col-lg-6">
        <ChartWrapper
          title="Top Clienti per Fatturato"
          subtitle="I clienti più redditizi"
          icon={<BarChart3 className="text-info" size={20} />}
          chartId="clienti"
          defaultVisible={true}
        >
          <TopClientiChart data={topClienti} loading={loading} />
        </ChartWrapper>
      </div>
      
      <div className="col-lg-6">
        <ChartWrapper
          title="Ripartizione per Deposito"
          subtitle="Distribuzione fatturato per ubicazione"
          icon={<Calendar className="text-secondary" size={20} />}
          chartId="depositi"
          defaultVisible={true}
        >
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ripartizioneDepositi}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#6366F1"
                  dataKey="value"
                  label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                >
                  {ripartizioneDepositi.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>
      </div>
    </div>
  );
}
