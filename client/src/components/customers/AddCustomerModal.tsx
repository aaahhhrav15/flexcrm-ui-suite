import * as React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CustomerService } from '@/services/CustomerService';
import transactionService from '@/services/transactionService';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';

// Enhanced Date Picker Component (inline)
const EnhancedDatePicker = ({ 
  value, 
  onChange, 
  placeholder = "Pick a date", 
  disabled = false, 
  className,
  fromYear = 1950,
  toYear = new Date().getFullYear() + 2 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i);

  const handleMonthChange = (monthIndex) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(parseInt(monthIndex));
    setCurrentMonth(newDate);
  };

  const handleYearChange = (year) => {
    const newDate = new Date(currentMonth);
    newDate.setFullYear(parseInt(year));
    setCurrentMonth(newDate);
  };

  const handleDateSelect = (date) => {
    onChange(date);
    setIsOpen(false);
  };

  const clearDate = () => {
    onChange(undefined);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full pl-3 text-left font-normal justify-start",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {value ? format(value, "PPP") : <span>{placeholder}</span>}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {/* Enhanced Header with Month/Year Selectors */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
          <Select 
            value={currentMonth.getMonth().toString()} 
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="w-[130px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={currentMonth.getFullYear().toString()} 
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="w-[100px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {years.reverse().map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Calendar */}
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          fromDate={new Date(fromYear, 0, 1)}
          toDate={new Date(toYear, 11, 31)}
          initialFocus
          className="p-0"
        />
        
        {/* Footer with selected date and clear option */}
        {value && (
          <div className="flex items-center justify-between p-3 border-t bg-muted/30">
            <div className="text-sm text-muted-foreground">
              Selected: {format(value, "MMM d, yyyy")}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDate}
              className="h-8 text-xs hover:bg-destructive/20 hover:text-destructive"
            >
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string()
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  address: z.string().optional(),
  source: z.enum(['website', 'referral', 'walk-in', 'social_media', 'other']),
  membershipType: z.enum(['none', 'basic', 'premium', 'vip']),
  membershipFees: z.number().min(0, 'Membership fees must be a positive number'),
  membershipDuration: z.number().min(0, 'Membership duration must be a positive number'),
  joinDate: z.date(),
  membershipStartDate: z.date(),
  membershipEndDate: z.date().optional(),
  transactionDate: z.date(),
  paymentMode: z.enum(['cash', 'card', 'upi', 'bank_transfer', 'other']),
  notes: z.string().optional(),
  birthday: z.date().optional(),
});

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      source: 'other',
      membershipType: 'none',
      membershipFees: 0,
      membershipDuration: 0,
      joinDate: new Date(),
      membershipStartDate: new Date(),
      transactionDate: new Date(),
      paymentMode: 'cash',
      notes: '',
      birthday: undefined
    }
  });

  // Add effect to calculate end date when start date or duration changes
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'membershipStartDate' || name === 'membershipDuration') {
        const startDate = form.getValues('membershipStartDate');
        const duration = form.getValues('membershipDuration');
        
        if (startDate && duration > 0) {
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + duration);
          form.setValue('membershipEndDate', endDate);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      const endDate = new Date(values.membershipStartDate);
      endDate.setMonth(endDate.getMonth() + values.membershipDuration);

      const response = await CustomerService.createCustomer({
        name: values.name,
        email: values.email,
        phone: values.phone || '',
        address: values.address || '',
        source: values.source,
        membershipType: values.membershipType,
        membershipFees: values.membershipFees,
        membershipDuration: values.membershipDuration,
        joinDate: values.joinDate,
        membershipStartDate: values.membershipStartDate,
        membershipEndDate: endDate,
        transactionDate: values.transactionDate,
        paymentMode: values.paymentMode,
        totalSpent: values.membershipFees,
        notes: values.notes || '',
        birthday: values.birthday
      });

      if (response.success && response.customer) {
        // Create transaction record for joining fees
        await transactionService.createTransaction({
          userId: response.customer._id,
          gymId: user?.gymId,
          transactionType: 'MEMBERSHIP_JOINING',
          transactionDate: values.transactionDate,
          amount: values.membershipFees,
          membershipType: values.membershipType,
          paymentMode: values.paymentMode,
          description: `${values.membershipType.toUpperCase()} membership joining fees for ${values.membershipDuration} months (${format(values.membershipStartDate, 'dd/MM/yyyy')} to ${format(endDate, 'dd/MM/yyyy')})`,
          status: 'SUCCESS'
        });

        // Show success message with invoice information if created
        if (response.invoice) {
          toast({
            title: "Success",
            description: `Customer created successfully! Invoice ${response.invoice.invoiceNumber} has been automatically generated for membership fees.`,
          });
        } else {
          toast({
            title: "Success",
            description: "Customer created successfully",
          });
        }

        await queryClient.invalidateQueries({ queryKey: ['customers'] });
        await queryClient.invalidateQueries({ queryKey: ['transactions', response.customer._id] });
        await queryClient.invalidateQueries({ queryKey: ['invoices'] });
        onClose();
        form.reset();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create customer",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={10} inputMode="numeric" pattern="[0-9]*" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="walk-in">Walk-in</SelectItem>
                        <SelectItem value="social_media">Social Media</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="membershipType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Membership Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="membershipFees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Membership Fees</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01"
                        {...field}
                        value={field.value || 0}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 0 : value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="membershipDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (months)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="1"
                        {...field}
                        value={field.value || 0}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                          field.onChange(isNaN(value) ? 0 : value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Enhanced Date Pickers - Only changes are here */}
              <FormField
                control={form.control}
                name="joinDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Join Date</FormLabel>
                    <FormControl>
                      <EnhancedDatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Pick join date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="membershipStartDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Membership Start Date</FormLabel>
                    <FormControl>
                      <EnhancedDatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Pick start date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthday"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Birthday (Optional)</FormLabel>
                    <FormControl>
                      <EnhancedDatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Pick birthday"
                        fromYear={1950}
                        toYear={new Date().getFullYear()}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transactionDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Transaction Date</FormLabel>
                    <FormControl>
                      <EnhancedDatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Pick transaction date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Mode</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Customer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};