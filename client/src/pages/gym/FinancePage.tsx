import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  CreditCard, 
  File, 
  PlusCircle, 
  Filter, 
  Download, 
  Printer,
  BarChart,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Search,
  Eye,
  Pencil,
  Trash,
  Calendar as CalendarIcon,
  TrendingUp
} from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import InvoiceService, { Invoice } from '@/services/InvoiceService';
import { formatCurrency } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import InvoiceForm from '@/components/invoices/InvoiceForm';
import axios from 'axios';
import { API_URL } from '@/lib/constants';
import { EditInvoiceModal } from '@/components/invoices/EditInvoiceModal';
import CustomerService from '@/services/CustomerService';
import { Calendar } from '@/components/ui/calendar';
import { addMonths, startOfMonth, endOfMonth, isSameDay, isSameMonth, isWithinInterval } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import * as Papa from 'papaparse';

const FinancePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);
  const [filterMode, setFilterMode] = useState<'daily' | 'monthly'>('daily');
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        const response = await CustomerService.getCustomers();
        return response;
      } catch (error) {
        console.error('Error fetching customers:', error);
        toast.error('Failed to fetch customers');
        return { customers: [], total: 0 };
      }
    }
  });

  const customers = customersData?.customers || [];

  // Fetch invoices
  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      try {
        const response = await InvoiceService.getInvoices();
        return response;
      } catch (error) {
        console.error('Error fetching invoices:', error);
        toast.error('Failed to fetch invoices');
        throw error;
      }
    }
  });

  // Calculate financial metrics
  const metrics = {
    totalRevenue: invoices?.reduce((sum, inv) => sum + inv.amount, 0) || 0,
    invoiceCount: invoices?.length || 0,
  };

  // Helper: get today's revenue
  const today = new Date();
  const todayRevenue = invoices?.reduce((sum, inv) => {
    const invDate = new Date(inv.createdAt);
    return isSameDay(invDate, today) ? sum + inv.amount : sum;
  }, 0) || 0;

  // Helper: get this month's revenue
  const thisMonthStart = startOfMonth(today);
  const thisMonthEnd = endOfMonth(today);
  const thisMonthRevenue = invoices?.reduce((sum, inv) => {
    const invDate = new Date(inv.createdAt);
    return isWithinInterval(invDate, { start: thisMonthStart, end: thisMonthEnd }) ? sum + inv.amount : sum;
  }, 0) || 0;

  // Revenue for selected day
  const selectedDayRevenue = selectedDate
    ? invoices?.reduce((sum, inv) => {
        const invDate = new Date(inv.createdAt);
        return isSameDay(invDate, selectedDate) ? sum + inv.amount : sum;
      }, 0) || 0
    : null;

  // Revenue for selected month
  const selectedMonthRevenue = selectedMonth
    ? invoices?.reduce((sum, inv) => {
        const invDate = new Date(inv.createdAt);
        return isSameMonth(invDate, selectedMonth) ? sum + inv.amount : sum;
      }, 0) || 0
    : null;

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const blob = await InvoiceService.downloadInvoice(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  const handlePrintInvoice = async (invoiceId: string) => {
    try {
      const blob = await InvoiceService.downloadInvoice(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      toast.success('Invoice opened for printing');
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast.error('Failed to print invoice');
    }
  };

  const handleViewInvoice = async (invoiceId: string) => {
    try {
      const blob = await InvoiceService.downloadInvoice(invoiceId);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success('Invoice opened in new tab');
    } catch (error) {
      console.error('Error viewing invoice:', error);
      toast.error('Failed to view invoice');
    }
  };

  const handleEditInvoice = async (invoiceId: string) => {
    try {
      const invoice = await InvoiceService.getInvoice(invoiceId);
      setSelectedInvoice(invoice);
      setIsEditModalOpen(true);
      toast.success('Invoice loaded for editing');
    } catch (error) {
      console.error('Error loading invoice for editing:', error);
      toast.error('Failed to load invoice for editing');
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      await InvoiceService.deleteInvoice(invoiceId);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice deleted successfully');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete?._id) {
      toast.error('Invalid invoice selected for deletion');
      return;
    }

    try {
      await InvoiceService.deleteInvoice(invoiceToDelete._id);
      toast.success('Invoice deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    } finally {
      setShowDeleteDialog(false);
      setInvoiceToDelete(null);
    }
  };

  // Filter invoices based on search query and selected date/month
  const filteredInvoices = invoices?.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof invoice.customerId === 'object' && invoice.customerId?.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const invDate = new Date(invoice.createdAt);
    let matchesDate = true;
    if (filterMode === 'daily' && selectedDate) {
      matchesDate = isSameDay(invDate, selectedDate);
    } else if (filterMode === 'monthly' && selectedMonth) {
      matchesDate = isSameMonth(invDate, selectedMonth);
    }
    return matchesSearch && matchesDate;
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Creating invoice with data:', data);
      try {
        const response = await axios.post(`${API_URL}/invoices`, {
          customerId: data.customerId,
          items: data.items,
          amount: data.amount,
          dueDate: data.dueDate,
          notes: data.notes,
          status: 'pending',
          currency: 'INR'
        }, { 
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Server response:', response.data);
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to create invoice');
        }
        return response.data;
      } catch (error: any) {
        console.error('Error in mutation function:', error);
        throw new Error(error.response?.data?.message || 'Failed to create invoice');
      }
    },
    onSuccess: (data) => {
      console.log('Invoice created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created successfully');
      setIsCreateInvoiceOpen(false);
    },
    onError: (error: Error) => {
      console.error('Invoice creation failed:', error);
      toast.error(error.message || 'Failed to create invoice');
    },
  });

  const handleCreateInvoice = async (data: any) => {
    console.log('handleCreateInvoice called with data:', data);
    try {
      await createInvoiceMutation.mutateAsync(data);
    } catch (error) {
      console.error('Error in handleCreateInvoice:', error);
      toast.error('Failed to create invoice. Please try again.');
    }
  };

  const handleExport = () => {
    if (!filteredInvoices || filteredInvoices.length === 0) {
      toast.info("No data to export.");
      return;
    }

    const dataToExport = filteredInvoices.map(invoice => {
      const customer = typeof invoice.customerId === 'object' 
        ? invoice.customerId 
        : customers.find(c => c._id === invoice.customerId);

      return {
        "Invoice Number": invoice.invoiceNumber,
        "Customer Name": customer?.name || 'N/A',
        "Customer Email": customer?.email || 'N/A',
        "Phone Number": customer?.phone || 'N/A',
        "Date": format(new Date(invoice.createdAt), 'yyyy-MM-dd'),
        "Cost": invoice.amount,
        "Description": invoice.items.map(item => item.description).join(', '),
      };
    });

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `invoices-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Data exported successfully!");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-[500px] w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div className="text-red-500">Error loading invoices. Please try again.</div>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })}>
            Retry
          </Button>
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
        {/* Header Section with Better Spacing */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-4 border-b">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Finance & Billing
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage your gym's financial transactions and invoices with ease.
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setIsCreateInvoiceOpen(true)} size="lg" className="shadow-sm">
              <PlusCircle className="mr-2 h-5 w-5" /> Create Invoice
            </Button>
            <Button variant="outline" size="lg" className="shadow-sm" onClick={handleExport}>
              <Download className="mr-2 h-5 w-5" /> Export Data
            </Button>
          </div>
        </div>

        {/* Combined Layout - Metrics, Filters, and Search */}
        <div className="grid grid-cols-1 xl:grid-cols-6 gap-6">
          {/* Left Column - Main Metrics (4 columns on xl screens) */}
          <div className="xl:col-span-4 space-y-6">
            {/* Primary Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="relative overflow-hidden border-0 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      All time earnings
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="relative overflow-hidden border-0 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/5" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <File className="h-5 w-5 text-green-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="text-2xl font-bold">{metrics.invoiceCount}</div>
                    <p className="text-xs text-muted-foreground">Generated invoices</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="relative overflow-hidden border-0 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
                    <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <BarChart className="h-5 w-5 text-purple-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="text-2xl font-bold">{formatCurrency(thisMonthRevenue)}</div>
                    <p className="text-xs text-muted-foreground">Current month revenue</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="relative overflow-hidden border-0 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/5" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {filterMode === 'daily' && selectedDate ? 'Selected Day' : filterMode === 'monthly' && selectedMonth ? 'Selected Month' : 'Today'}
                    </CardTitle>
                    <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <CalendarIcon className="h-5 w-5 text-orange-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="text-2xl font-bold">
                      {filterMode === 'daily' && selectedDate
                        ? formatCurrency(selectedDayRevenue || 0)
                        : filterMode === 'monthly' && selectedMonth
                        ? formatCurrency(selectedMonthRevenue || 0)
                        : formatCurrency(todayRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {filterMode === 'daily' && selectedDate
                        ? selectedDate.toLocaleDateString()
                        : filterMode === 'monthly' && selectedMonth
                        ? selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
                        : 'Today\'s revenue'}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Search Bar - directly below metrics, full width */}
            <div className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice number or customer..."
                  className="pl-10 h-11 shadow-sm border-muted-foreground/20 focus:ring-2 focus:ring-primary/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Filters only (no search bar) */}
          <div className="xl:col-span-2 space-y-6">
            {/* Filter Controls */}
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filter Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">Filter Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant={filterMode === 'daily' ? 'default' : 'outline'}
                      onClick={() => setFilterMode('daily')}
                      className="w-full"
                    >
                      Daily
                    </Button>
                    <Button
                      size="sm"
                      variant={filterMode === 'monthly' ? 'default' : 'outline'}
                      onClick={() => setFilterMode('monthly')}
                      className="w-full"
                    >
                      Monthly
                    </Button>
                  </div>
                </div>

                {filterMode === 'daily' && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-muted-foreground">Select Date</label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {selectedDate ? selectedDate.toLocaleDateString() : 'Pick a day'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={date => {
                            setSelectedDate(date);
                            setCalendarOpen(false);
                          }}
                          className="rounded-md border bg-background"
                        />
                      </PopoverContent>
                    </Popover>
                    {selectedDate && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setSelectedDate(null)} 
                        className="w-full text-muted-foreground hover:text-foreground"
                      >
                        Clear Selection
                      </Button>
                    )}
                  </div>
                )}

                {filterMode === 'monthly' && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-muted-foreground">Select Month</label>
                    <Select
                      value={selectedMonth ? selectedMonth.toISOString() : ''}
                      onValueChange={val => setSelectedMonth(val ? new Date(val) : null)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pick month" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(12)].map((_, i) => {
                          const monthDate = new Date(today.getFullYear(), i, 1);
                          return (
                            <SelectItem key={i} value={monthDate.toISOString()}>
                              {monthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {selectedMonth && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setSelectedMonth(null)} 
                        className="w-full text-muted-foreground hover:text-foreground"
                      >
                        Clear Selection
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Table Section - Full width and lower */}
        <div className="mt-8">
          <Card className="shadow-lg border-0">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold">Invoice Management</CardTitle>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {filteredInvoices?.length || 0} invoices
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-muted/50">
                      <TableHead className="font-semibold">Invoice Number</TableHead>
                      <TableHead className="font-semibold">Customer</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Amount</TableHead>
                      <TableHead className="font-semibold w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices?.map((invoice, index) => (
                      <motion.tr
                        key={invoice._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-medium text-primary">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell className="font-medium">
                          {typeof invoice.customerId === 'string' 
                            ? <span className="text-muted-foreground">Loading...</span>
                            : invoice.customerId?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(invoice.amount, invoice.currency)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleViewInvoice(invoice._id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditInvoice(invoice._id)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadInvoice(invoice._id)}>
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => handleDeleteInvoice(invoice._id)}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete Invoice
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the invoice
              and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteInvoice}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InvoiceForm
        open={isCreateInvoiceOpen}
        onClose={() => setIsCreateInvoiceOpen(false)}
        onSubmit={handleCreateInvoice}
        customers={customers}
      />

      <EditInvoiceModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
        }}
      />
    </DashboardLayout>
  );
};

export default FinancePage;