import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Users, UserCheck, UserX, CalendarClock, Plus, UserPlus, UserMinus, Calendar, DollarSign, ShoppingCart, TrendingUp, Cake, Gift, BarChart3, Target, AlertCircle, Activity } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useIndustry } from '@/context/IndustryContext';
import { useGym } from '@/context/GymContext';
import axiosInstance from '@/lib/axios';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  format?: 'number' | 'currency';
  isLoading?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  iconColor?: string;
  delay?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon, 
  format = 'number', 
  isLoading,
  gradientFrom = 'blue-500',
  gradientTo = 'blue-600',
  iconColor = 'blue-600',
  delay = 0
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="relative overflow-hidden border-0 shadow-lg">
        <div className={`absolute inset-0 bg-gradient-to-br from-${gradientFrom}/10 to-${gradientTo}/5`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={`h-10 w-10 rounded-full bg-${gradientFrom}/10 flex items-center justify-center`}>
            {React.cloneElement(icon as React.ReactElement, { 
              className: `h-5 w-5 text-${iconColor}` 
            })}
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-bold">
              {format === 'currency' 
                ? formatCurrency(typeof value === 'string' ? parseFloat(value) : value) 
                : typeof value === 'string' ? value : value.toLocaleString()}
            </div>
          )}
          <p className="text-xs text-muted-foreground flex items-center">
            <Activity className="h-3 w-3 mr-1" />
            Real-time data
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Default metrics data
const defaultMetrics = {
  members: {
    totalMembers: 0,
    activeMembers: 0,
    inactiveMembers: 0,
    todayExpiry: 0,
    todayEmployees: 0,
    todayEnrolled: 0,
    totalMemberAmount: 0,
    todayEmployeeBirthdays: 0,
    todayInvoices: 0,
    totalInvoices: 0,
    todayDueAmount: 0,
    todayMemberBirthdays: 0,
    todayExpense: 0,
    totalExpense: 0,
    todayEnquiry: 0,
    todayFollowUps: 0
  },
  memberProfit: {
    memberAmount: 0,
    memberExpense: 0,
    totalMemberProfit: 0
  },
  pos: {
    todayPurchase: 0,
    totalPurchase: 0,
    totalStockValue: 0,
    lowStockValue: 0,
    totalClearingAmount: 0,
    todaySell: 0,
    totalSell: 0,
    totalSellPurchaseValue: 0,
    todaySellInvoice: 0,
    totalSellInvoice: 0,
    sellDueAmount: 0,
    totalPosExpense: 0,
    todayPosExpense: 0
  },
  posProfit: {
    posProfit: 0,
    posExpense: 0
  },
  overallProfit: {
    totalProfit: 0
  }
};

const Dashboard: React.FC = () => {
  // Fetch dashboard metrics
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/dashboard`, {
        withCredentials: true
      });
      return response.data.metrics;
    }
  });

  const metrics = dashboardData || defaultMetrics;

  // --- Monthly Expense Logic ---
  const { gym } = useGym();
  const [monthlyExpense, setMonthlyExpense] = useState<number>(0);
  const [isMonthlyExpenseLoading, setIsMonthlyExpenseLoading] = useState(false);
  const [todayExpense, setTodayExpense] = useState<number>(0);
  const [isTodayExpenseLoading, setIsTodayExpenseLoading] = useState(false);
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [isTotalExpenseLoading, setIsTotalExpenseLoading] = useState(false);
  const [profitExpense, setProfitExpense] = useState<number>(0);
  const [isProfitExpenseLoading, setIsProfitExpenseLoading] = useState(false);
  const [totalGymProfit, setTotalGymProfit] = useState<number>(0);

  useEffect(() => {
    const fetchTodayExpense = async () => {
      if (!gym?._id) return;
      setIsTodayExpenseLoading(true);
      try {
        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        // Fetch all expenses for today
        const response = await axiosInstance.get(`/gym/expenses?gymId=${gym._id}&month=${month}&year=${year}`);
        const expenses = Array.isArray(response.data) ? response.data : [];
        const todayStr = today.toISOString().slice(0, 10);
        const total = expenses.filter(e => e.date && e.date.slice(0, 10) === todayStr && e.category === 'gym')
          .reduce((sum, expense) => sum + (expense.amount || 0), 0);
        setTodayExpense(total);
      } catch (error) {
        setTodayExpense(0);
      } finally {
        setIsTodayExpenseLoading(false);
      }
    };
    fetchTodayExpense();
  }, [gym]);

  useEffect(() => {
    const fetchMonthlyExpense = async () => {
      if (!gym?._id) return;
      setIsMonthlyExpenseLoading(true);
      try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const response = await axiosInstance.get(`/gym/expenses?gymId=${gym._id}&month=${month}&year=${year}`);
        const total = Array.isArray(response.data)
          ? response.data.filter(e => e.category === 'gym').reduce((sum, expense) => sum + (expense.amount || 0), 0)
          : 0;
        setMonthlyExpense(total);
      } catch (error) {
        setMonthlyExpense(0);
      } finally {
        setIsMonthlyExpenseLoading(false);
      }
    };
    fetchMonthlyExpense();
  }, [gym]);

  useEffect(() => {
    const fetchTotalExpense = async () => {
      if (!gym?._id) return;
      setIsTotalExpenseLoading(true);
      try {
        // Fetch all expenses for this gym
        const response = await axiosInstance.get(`/gym/expenses?gymId=${gym._id}`);
        const expenses = Array.isArray(response.data) ? response.data : [];
        const total = expenses.filter(e => e.category === 'gym').reduce((sum, expense) => sum + (expense.amount || 0), 0);
        setTotalExpense(total);
      } catch (error) {
        setTotalExpense(0);
      } finally {
        setIsTotalExpenseLoading(false);
      }
    };
    fetchTotalExpense();
  }, [gym]);

  useEffect(() => {
    const fetchProfitExpense = async () => {
      if (!gym?._id) return;
      setIsProfitExpenseLoading(true);
      try {
        // Fetch all expenses for this gym
        const response = await axiosInstance.get(`/gym/expenses?gymId=${gym._id}`);
        const expenses = Array.isArray(response.data) ? response.data : [];
        const total = expenses.filter(e => e.category === 'gym').reduce((sum, expense) => sum + (expense.amount || 0), 0);
        setProfitExpense(total);
      } catch (error) {
        setProfitExpense(0);
      } finally {
        setIsProfitExpenseLoading(false);
      }
    };
    fetchProfitExpense();
  }, [gym]);

  // Calculate total gym profit whenever member amount or expenses change
  useEffect(() => {
    const memberAmount = metrics.memberProfit.memberAmount || 0;
    const calculatedProfit = memberAmount - profitExpense;
    setTotalGymProfit(calculatedProfit);
  }, [metrics.memberProfit.memberAmount, profitExpense]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-[300px] w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-8"
      >
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-4 border-b">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Dashboard Overview
            </h1>
            <p className="text-muted-foreground text-lg">
              Real-time insights into your gym's performance and analytics.
            </p>
          </div>
        </div>

        {/* Gym Insights Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full" />
            <h2 className="text-2xl font-bold">Gym Insights</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Members"
              value={dashboardData?.members?.totalMembers || 0}
              icon={<Users />}
              isLoading={isLoading}
              gradientFrom="blue-500"
              gradientTo="blue-600"
              iconColor="blue-600"
              delay={0.1}
            />
            <MetricCard
              title="Active Members"
              value={dashboardData?.members?.activeMembers || 0}
              icon={<UserPlus />}
              isLoading={isLoading}
              gradientFrom="green-500"
              gradientTo="green-600"
              iconColor="green-600"
              delay={0.15}
            />
            <MetricCard
              title="Inactive Members"
              value={dashboardData?.members?.inactiveMembers || 0}
              icon={<UserMinus />}
              isLoading={isLoading}
              gradientFrom="red-500"
              gradientTo="red-600"
              iconColor="red-600"
              delay={0.2}
            />
            <MetricCard
              title="Today's Expiring"
              value={dashboardData?.members?.todayExpiry || 0}
              icon={<AlertCircle />}
              isLoading={isLoading}
              gradientFrom="orange-500"
              gradientTo="orange-600"
              iconColor="orange-600"
              delay={0.25}
            />
            <MetricCard
              title="Today Enrolled"
              value={dashboardData?.members?.todayEnrolled || 0}
              icon={<UserPlus />}
              isLoading={isLoading}
              gradientFrom="emerald-500"
              gradientTo="emerald-600"
              iconColor="emerald-600"
              delay={0.3}
            />
            <MetricCard
              title="Total Member Amount"
              value={dashboardData?.members?.totalMemberAmount || 0}
              icon={<DollarSign />}
              format="currency"
              isLoading={isLoading}
              gradientFrom="purple-500"
              gradientTo="purple-600"
              iconColor="purple-600"
              delay={0.35}
            />
            <MetricCard
              title="Employee Birthdays"
              value={dashboardData?.members?.todayEmployeeBirthdays || 0}
              icon={<Cake />}
              isLoading={isLoading}
              gradientFrom="pink-500"
              gradientTo="pink-600"
              iconColor="pink-600"
              delay={0.4}
            />
            <MetricCard
              title="Member Birthdays"
              value={dashboardData?.members?.todayMemberBirthdays || 0}
              icon={<Gift />}
              isLoading={isLoading}
              gradientFrom="indigo-500"
              gradientTo="indigo-600"
              iconColor="indigo-600"
              delay={0.45}
            />
            <MetricCard
              title="Today Invoices"
              value={dashboardData?.members?.todayInvoices || 0}
              icon={<BarChart3 />}
              isLoading={isLoading}
              gradientFrom="cyan-500"
              gradientTo="cyan-600"
              iconColor="cyan-600"
              delay={0.5}
            />
            <MetricCard
              title="Total Invoices"
              value={dashboardData?.members?.totalInvoices || 0}
              icon={<BarChart3 />}
              isLoading={isLoading}
              gradientFrom="teal-500"
              gradientTo="teal-600"
              iconColor="teal-600"
              delay={0.55}
            />
            <MetricCard
              title="Today Due Amount"
              value={dashboardData?.members?.todayDueAmount || 0}
              icon={<AlertCircle />}
              format="currency"
              isLoading={isLoading}
              gradientFrom="amber-500"
              gradientTo="amber-600"
              iconColor="amber-600"
              delay={0.6}
            />
            <MetricCard
              title="Today Expense"
              value={todayExpense}
              icon={<DollarSign />}
              format="currency"
              isLoading={isTodayExpenseLoading}
              gradientFrom="slate-500"
              gradientTo="slate-600"
              iconColor="slate-600"
              delay={0.65}
            />
            <MetricCard
              title={`Monthly Expense (${format(new Date(), 'MMMM yyyy')})`}
              value={monthlyExpense}
              icon={<Calendar />}
              format="currency"
              isLoading={isMonthlyExpenseLoading}
              gradientFrom="violet-500"
              gradientTo="violet-600"
              iconColor="violet-600"
              delay={0.7}
            />
            <MetricCard
              title="Total Expense"
              value={totalExpense}
              icon={<TrendingUp />}
              format="currency"
              isLoading={isTotalExpenseLoading}
              gradientFrom="rose-500"
              gradientTo="rose-600"
              iconColor="rose-600"
              delay={0.75}
            />
            <MetricCard
              title="Today Enquiry"
              value={dashboardData?.members?.todayEnquiry || 0}
              icon={<Users />}
              isLoading={isLoading}
              gradientFrom="lime-500"
              gradientTo="lime-600"
              iconColor="lime-600"
              delay={0.8}
            />
            <MetricCard
              title="Today Follow-Ups"
              value={dashboardData?.members?.todayFollowUps || 0}
              icon={<Target />}
              isLoading={isLoading}
              gradientFrom="sky-500"
              gradientTo="sky-600"
              iconColor="sky-600"
              delay={0.85}
            />
          </div>
        </div>

        {/* Profit Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-gradient-to-b from-green-500 to-green-600 rounded-full" />
            <h2 className="text-2xl font-bold">Profit Analysis</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard 
              title="Member Amount" 
              value={metrics.memberProfit.memberAmount} 
              format="currency"
              icon={<DollarSign />}
              isLoading={isLoading}
              gradientFrom="emerald-500"
              gradientTo="emerald-600"
              iconColor="emerald-600"
              delay={0.1}
            />
            <MetricCard 
              title="Total Expenses" 
              value={profitExpense} 
              format="currency"
              icon={<TrendingUp />}
              isLoading={isProfitExpenseLoading}
              gradientFrom="red-500"
              gradientTo="red-600"
              iconColor="red-600"
              delay={0.2}
            />
            <MetricCard 
              title="Total Gym Profit" 
              value={totalGymProfit} 
              format="currency"
              icon={<Target />}
              isLoading={isLoading || isProfitExpenseLoading}
              gradientFrom="green-500"
              gradientTo="green-600"
              iconColor="green-600"
              delay={0.3}
            />
          </div>
        </div>

        {/* POS Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full" />
            <h2 className="text-2xl font-bold">Point of Sale</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <MetricCard 
              title="Today Purchase" 
              value={metrics.pos.todayPurchase} 
              format="currency"
              icon={<ShoppingCart />}
              isLoading={isLoading}
              gradientFrom="blue-500"
              gradientTo="blue-600"
              iconColor="blue-600"
              delay={0.1}
            />
            <MetricCard 
              title="Total Purchase" 
              value={metrics.pos.totalPurchase} 
              format="currency"
              icon={<ShoppingCart />}
              isLoading={isLoading}
              gradientFrom="indigo-500"
              gradientTo="indigo-600"
              iconColor="indigo-600"
              delay={0.15}
            />
            <MetricCard 
              title="Total Stock Value" 
              value={metrics.pos.totalStockValue} 
              format="currency"
              icon={<BarChart3 />}
              isLoading={isLoading}
              gradientFrom="green-500"
              gradientTo="green-600"
              iconColor="green-600"
              delay={0.2}
            />
            <MetricCard 
              title="Low Stock Value" 
              value={metrics.pos.lowStockValue} 
              format="currency"
              icon={<AlertCircle />}
              isLoading={isLoading}
              gradientFrom="orange-500"
              gradientTo="orange-600"
              iconColor="orange-600"
              delay={0.25}
            />
            <MetricCard 
              title="Total Clearing Amount" 
              value={metrics.pos.totalClearingAmount} 
              format="currency"
              icon={<DollarSign />}
              isLoading={isLoading}
              gradientFrom="purple-500"
              gradientTo="purple-600"
              iconColor="purple-600"
              delay={0.3}
            />
            <MetricCard 
              title="Today Sell" 
              value={metrics.pos.todaySell} 
              format="currency"
              icon={<TrendingUp />}
              isLoading={isLoading}
              gradientFrom="emerald-500"
              gradientTo="emerald-600"
              iconColor="emerald-600"
              delay={0.35}
            />
            <MetricCard 
              title="Total Sell" 
              value={metrics.pos.totalSell} 
              format="currency"
              icon={<TrendingUp />}
              isLoading={isLoading}
              gradientFrom="teal-500"
              gradientTo="teal-600"
              iconColor="teal-600"
              delay={0.4}
            />
            <MetricCard 
              title="Total Sell Purchase Value" 
              value={metrics.pos.totalSellPurchaseValue} 
              format="currency"
              icon={<BarChart3 />}
              isLoading={isLoading}
              gradientFrom="cyan-500"
              gradientTo="cyan-600"
              iconColor="cyan-600"
              delay={0.45}
            />
            <MetricCard 
              title="Today Sell Invoice" 
              value={metrics.pos.todaySellInvoice} 
              icon={<BarChart3 />}
              isLoading={isLoading}
              gradientFrom="pink-500"
              gradientTo="pink-600"
              iconColor="pink-600"
              delay={0.5}
            />
            <MetricCard 
              title="Total Sell Invoice" 
              value={metrics.pos.totalSellInvoice} 
              icon={<BarChart3 />}
              isLoading={isLoading}
              gradientFrom="rose-500"
              gradientTo="rose-600"
              iconColor="rose-600"
              delay={0.55}
            />
            <MetricCard 
              title="Sell Due Amount" 
              value={metrics.pos.sellDueAmount} 
              format="currency"
              icon={<AlertCircle />}
              isLoading={isLoading}
              gradientFrom="amber-500"
              gradientTo="amber-600"
              iconColor="amber-600"
              delay={0.6}
            />
            <MetricCard 
              title="Total POS Expense" 
              value={metrics.pos.totalPosExpense} 
              format="currency"
              icon={<DollarSign />}
              isLoading={isLoading}
              gradientFrom="slate-500"
              gradientTo="slate-600"
              iconColor="slate-600"
              delay={0.65}
            />
            <MetricCard 
              title="Today POS Expense" 
              value={metrics.pos.todayPosExpense} 
              format="currency"
              icon={<DollarSign />}
              isLoading={isLoading}
              gradientFrom="gray-500"
              gradientTo="gray-600"
              iconColor="gray-600"
              delay={0.7}
            />
          </div>
        </div>

        {/* POS Profit Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full" />
            <h2 className="text-2xl font-bold">POS Profit Analysis</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MetricCard 
              title="POS Profit" 
              value={metrics.posProfit.posProfit} 
              format="currency"
              icon={<TrendingUp />}
              isLoading={isLoading}
              gradientFrom="green-500"
              gradientTo="green-600"
              iconColor="green-600"
              delay={0.1}
            />
            <MetricCard 
              title="POS Expense" 
              value={metrics.posProfit.posExpense} 
              format="currency"
              icon={<DollarSign />}
              isLoading={isLoading}
              gradientFrom="red-500"
              gradientTo="red-600"
              iconColor="red-600"
              delay={0.2}
            />
          </div>
        </div>

        {/* Overall Profit Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full" />
            <h2 className="text-2xl font-bold">Overall Performance</h2>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <MetricCard 
              title="Total Business Profit" 
              value={metrics.overallProfit.totalProfit} 
              format="currency"
              icon={<Target />}
              isLoading={isLoading}
              gradientFrom="emerald-500"
              gradientTo="emerald-600"
              iconColor="emerald-600"
              delay={0.1}
            />
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Dashboard;