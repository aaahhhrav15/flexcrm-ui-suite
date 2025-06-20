import React from 'react';
import { format, addMonths, isValid } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Customer } from '@/services/CustomerService';
import { RenewMembershipModal } from './RenewMembershipModal';
import { TransactionHistory } from './TransactionHistory';
import { Receipt, User, CreditCard, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ViewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

interface MembershipStatus {
  status: string;
  variant: BadgeVariant;
}

const formatDate = (date: string | Date | undefined) => {
  if (!date) return 'Not set';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return isValid(dateObj) ? format(dateObj, 'PPP') : 'Invalid date';
};

const formatBirthday = (date?: string | Date) => {
  if (!date) return 'Not provided';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return isValid(dateObj) ? format(dateObj, 'PPP') : 'Invalid date';
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

const getMembershipTypeColor = (type: string) => {
  switch (type) {
    case 'basic':
      return 'bg-blue-500';
    case 'premium':
      return 'bg-purple-500';
    case 'vip':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
};

const getMembershipStatus = (endDate: Date | null): MembershipStatus => {
  if (!endDate) return { status: 'No Membership', variant: 'secondary' };
  
  const today = new Date();
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'Membership Expired', variant: 'destructive' };
  } else if (diffDays === 0) {
    return { status: 'Expiring Today', variant: 'destructive' };
  } else if (diffDays <= 10) {
    return { status: `Expiring in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`, variant: 'secondary' };
  } else {
    return { status: 'Active', variant: 'default' };
  }
};

const calculateEndDate = (startDate: string | Date | undefined, duration: number) => {
  if (!startDate || !duration) return null;
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  return isValid(start) ? addMonths(start, duration) : null;
};

const formatPaymentMode = (mode: string | undefined) => {
  if (!mode) return 'Not set';
  return mode.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export const ViewCustomerModal: React.FC<ViewCustomerModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const [isRenewModalOpen, setIsRenewModalOpen] = React.useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(isOpen);
  const [membershipEndDate, setMembershipEndDate] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setIsDialogOpen(isOpen);
  }, [isOpen]);

  React.useEffect(() => {
    const endDate = customer.membershipEndDate 
      ? new Date(customer.membershipEndDate)
      : calculateEndDate(customer.membershipStartDate, customer.membershipDuration);
    setMembershipEndDate(endDate);
  }, [customer.membershipStartDate, customer.membershipDuration, customer.membershipEndDate]);

  const handleClose = () => {
    setIsDialogOpen(false);
    onClose();
  };

  const isMembershipExpired = membershipEndDate ? membershipEndDate < new Date() : false;

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Basic
              </TabsTrigger>
              <TabsTrigger value="membership" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Membership
              </TabsTrigger>
              <TabsTrigger value="additional" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Additional
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsTransactionModalOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <Receipt className="h-4 w-4" />
                      View Transactions
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{customer.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{customer.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{customer.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{customer.address || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={getMembershipStatus(membershipEndDate).variant}>
                        {getMembershipStatus(membershipEndDate).status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Birthday</p>
                      <p className="font-medium">{formatBirthday(customer.birthday)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="membership">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Membership Information</h3>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsRenewModalOpen(true)}
                      className={isMembershipExpired ? "text-red-500 hover:text-red-600" : ""}
                    >
                      {isMembershipExpired ? "Renew Expired Membership" : "Renew Membership"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Membership Type</p>
                      <Badge className={`${getMembershipTypeColor(customer.membershipType || 'none')} text-white`}>
                        {customer.membershipType?.toUpperCase() || 'NONE'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">{customer.membershipDuration} months</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fees</p>
                      <p className="font-medium">{formatCurrency(customer.membershipFees)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Spent</p>
                      <p className="font-medium">{formatCurrency(customer.totalSpent)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium">{formatDate(customer.membershipStartDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expiry Date</p>
                      <p className="font-medium">
                        {formatDate(membershipEndDate)}
                        {isMembershipExpired && (
                          <Badge variant="destructive" className="ml-2">Expired</Badge>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Join Date</p>
                      <p className="font-medium">{formatDate(customer.joinDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Transaction Date</p>
                      <p className="font-medium">{formatDate(customer.transactionDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Mode</p>
                      <p className="font-medium capitalize">{customer.paymentMode || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Membership Status</p>
                      <Badge variant={isMembershipExpired ? "destructive" : "default"}>
                        {isMembershipExpired ? "EXPIRED" : "ACTIVE"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="additional">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Source</p>
                      <p className="font-medium capitalize">{customer.source || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created At</p>
                      <p className="font-medium">{formatDate(customer.createdAt)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="font-medium">{customer.notes || 'No notes available'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            {customer.membershipType !== 'none' && (
              <Button onClick={() => setIsRenewModalOpen(true)}>
                Renew Membership
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RenewMembershipModal
        isOpen={isRenewModalOpen}
        onClose={() => setIsRenewModalOpen(false)}
        customer={customer}
      />

      <Dialog open={isTransactionModalOpen} onOpenChange={setIsTransactionModalOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Transaction History</DialogTitle>
          </DialogHeader>
          <TransactionHistory userId={customer.id} />
        </DialogContent>
      </Dialog>
    </>
  );
};
