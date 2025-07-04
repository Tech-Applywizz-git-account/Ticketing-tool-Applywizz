import React, { useState, useEffect } from 'react';
import { User, Ticket, Client, AssignedUser, DashboardStats, TicketStatus, TicketType } from './types';
import { LoginForm } from './components/Login/LoginForm';
import { Navbar } from './components/Layout/Navbar';
import { Sidebar } from './components/Layout/Sidebar';
import { DashboardStats as DashboardStatsComponent } from './components/Dashboard/DashboardStats';
import { ExecutiveDashboard } from './components/Dashboard/ExecutiveDashboard';
import { format } from 'date-fns';
import { TicketList } from './components/Tickets/Shared/TicketList';
import { CreateTicketModal } from './components/Tickets/Shared/CreateTicketModal';
import { VLTicketEditModal } from './components/Tickets/VolumeShortfall/VLTicketEditModal';
import { TicketEditModal } from './components/Tickets/ResumeUpdate/RUTicketEditModel';
import { ClientOnboardingModal } from './components/Clients/ClientOnboardingModal';
import { PendingOnboardingList } from './components/Clients/PendingOnboardingList';
import { ClientEditModal } from './components/Clients/ClientEditModal';
import { UserManagementModal } from './components/Admin/UserManagementModal';
import { Plus, Users, FileText, BarChart3, UserPlus, Edit, Settings } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { DialogProvider } from './context/DialogContext';
import { supabaseAdmin } from './lib/supabaseAdminClient';
import EmailConfirmed from './components/Auth/EmailConfirmed';
import LinkExpired from './components/Auth/link-expired';
import EmailVerifyRedirect from './components/Auth/EmailVerifyRedirect';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import ProtectedRoute from './components/Auth/ProtectedRoute';




function App() {
  const fetchData = async () => {
    // 1. Get all tickets
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .order('createdat', { ascending: false });
    // if(ticketData)console.log(ticketData);
    if (ticketError) console.error(ticketError);

    // 2. Get all users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*');
    // if(userData) console.log(userData);
    if (userError) console.error(userError);

    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*');

    if (clientError) {
      console.error("Error loading clients:", clientError.message);
    } else {
      // console.log("Clients:", clientData);
      setClients(clientData || []);
    }


    // 3. Get all ticket assignments
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('ticket_assignments')
      .select('ticket_id, user_id');

    if (assignmentError) console.error(assignmentError);

    // 4. Map ticket_id → [user objects]
    // const userMap = new Map(userData.map(u => [u.id, u.name]));
    const userMap = new Map(
      (userData ?? []).map(u => [u.id, u.name])
    );

    const assignmentMap: Record<string, AssignedUser[]> = {};
    assignmentData?.forEach(({ ticket_id, user_id }) => {
      if (!assignmentMap[ticket_id]) assignmentMap[ticket_id] = [];
      // assignmentMap[ticket_id].push({ id: user_id, name: userMap.get(user_id) });
      assignmentMap[ticket_id].push({
        id: user_id,
        name: userMap.get(user_id) ?? 'Unknown',
        role: userData.find(u => u.id === user_id)?.role || 'Unknown Role'
      });

    });

    const { data: escalationData, error: escalationError } = await supabase
      .from('ticket_escalations')
      .select(`
        id, reason, created_at, ticket_id, ca_id, escalated_by,
        tickets ( id, title, type, short_code ),
        ca: users!ticket_escalations_ca_id_fkey ( name ),
        escalated_by_user: users!ticket_escalations_escalated_by_fkey ( name )
        `);

    if (escalationError) {
      console.error('Failed to fetch escalations:', escalationError);
    } else {
      setEscalations(escalationData || []);
    }

    const { data: pendingClientsData, error: pendingClientsError } = await supabase
      .from('pending_clients')
      .select('*');

    if (pendingClientsError) {
      console.error("Error loading pending clients:", pendingClientsError.message);
    } else {
      setPendingClients(pendingClientsData || []);
    }


    setTickets(ticketData || []);
    setUsers(userData || []);
    setAssignments(assignmentMap);
  };

  const handleTicketUpdated = async () => {
    await fetchData(); // Refreshes tickets and assignments
  };
  // State to store the current user
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [pendingClients, setPendingClients] = useState<any[]>([]);
  const [filterPriority, setFilterPriority] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');


  // State to store the clients
  const [clients, setClients] = useState<Client[]>([]);

  // State to store the active view
  const [activeView, setActiveView] = useState('dashboard');
  // State to store whether the create ticket modal is open
  const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
  // State to store whether the client onboarding modal is open
  const [isClientOnboardingModalOpen, setIsClientOnboardingModalOpen] = useState(false);
  // State to store whether the user management modal is open
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  // State to store the selected ticket
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  // State to store the selected client
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  // State to store whether the ticket edit modal is open
  const [isTicketEditModalOpen, setIsTicketEditModalOpen] = useState(false);
  // State to store whether the client edit modal is open
  const [isClientEditModalOpen, setIsClientEditModalOpen] = useState(false);

  const [assignments, setAssignments] = useState<Record<string, AssignedUser[]>>({});

  const [escalations, setEscalations] = useState<any[]>([]);

  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<TicketType | 'all'>('all');

  useEffect(() => {
    fetchData();
  }, []);
  // assignments: Record<string, { id: string; name: string; role: string }[]>

  // Function to handle user login
  // const handleLogin = (user: User) => {
  //   setCurrentUser(user);
  //   // console.log('Logged in user:', user.name, 'with role:', user.role);
  // };
  // // console.log('Logged in user:', currentUser?.name, currentUser?.role);

  // // Function to handle logout
  // const handleLogout = () => {
  //   setCurrentUser(null);
  //   setActiveView('dashboard');
  // };
  useEffect(() => {
    // Restore user from localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch (e) {
        console.error('Failed to parse stored user', e);
      }
    }

    // Restore active view from sessionStorage
    const storedView = sessionStorage.getItem('activeView');
    if (storedView) {
      setActiveView(storedView);
    }

    fetchData(); // Keep existing fetchData call
  }, []); // Empty dependency array = runs only once on mount

  // Add this to save view changes
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('activeView', activeView);
    }
  }, [activeView, currentUser]); // Runs whenever activeView or currentUser changes

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    // console.log('Logged in user:', user.name, 'with role:', user.role);
  };
  // console.log('Logged in user:', currentUser?.name, currentUser?.role);

  // Function to handle logout
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setActiveView('dashboard');
  };

  const getVisibleTickets = (): Ticket[] => {
    if (!currentUser) return [];

    // Executive/Managerial roles see all tickets
    if (['ceo', 'coo', 'cro', 'account_manager'].includes(currentUser.role)) {
      return tickets;
    }

    // For other roles, filter tickets based on assignments
    return tickets.filter(ticket => {
      const assignedUsers = assignments[ticket.id] || [];
      return assignedUsers.some(assignedUser => assignedUser.id === currentUser.id);
    });
  };




  const handleCreateTicket = async (ticketData: any) => {
    const newTicket = {
      ...ticketData,
      created_by: currentUser!.id,
      status: 'open',
      escalation_level: 0,
      // createdat: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: JSON.stringify([]),
      metadata: JSON.stringify(ticketData.metadata || {}),
    };

    const { error } = await supabase.from('tickets').insert(newTicket);

    if (error) {
      console.error('Failed to create ticket:', error);
      alert('Could not create ticket.');
    }
    else {
      await fetchData();
      setIsCreateTicketModalOpen(false);
    }
  };

  const handleAssignRoles = async (
    pendingClientId: string,
    clientData: any,          // ✅ Add this
    rolesData: any
  ) => {
    console.log("INSERT PAYLOAD", {
      ...clientData,
      ...rolesData
    });

    const { error: insertError } = await supabase.from('clients').insert({
      full_name: clientData.full_name,
      personal_email: clientData.personal_email,
      whatsapp_number: clientData.whatsapp_number,
      callable_phone: clientData.callable_phone,
      company_email: clientData.company_email,
      job_role_preferences: clientData.job_role_preferences,
      salary_range: clientData.salary_range,
      location_preferences: clientData.location_preferences,
      work_auth_details: clientData.work_auth_details,
      account_manager_id: rolesData.accountManagerId,
      careerassociatemanagerid: rolesData.careerassociatemanagerid,
      careerassociateid: rolesData.careerassociateid,
      scraperid: rolesData.scraperid,
      onboarded_by: currentUser!.id
    });

    if (insertError) {
      alert("Failed to complete onboarding");
      console.error("Onboarding failed:", insertError.message);
      return;
    }

    await supabase.from('pending_clients').delete().eq('id', pendingClientId);
    await fetchData();
  };

  const handleUpdateTicket = async (ticketId: string, updateData: any) => {
    // 1. Update in Supabase
    const { error } = await supabase
      .from('tickets')
      .update({
        ...updateData,
        updatedAt: new Date().toISOString()
      })
      .eq('id', ticketId);

    if (error) {
      console.error('Failed to update ticket:', error);
      // alert('Could not update ticket.');
      return;
    }

    // 2. Refresh tickets after update
    await fetchData();
  };



  const renderTicketEditModal = (selectedTicket: Ticket | null, selectedView: string) => {
    if (!selectedTicket || selectedView !== "edit") return null;

    switch (selectedTicket.type) {
      case "volume_shortfall":
        return (
          <VLTicketEditModal
            ticket={selectedTicket}
            user={currentUser}
            isOpen={isTicketEditModalOpen}
            assignments={assignments}
            onClose={() => {
              setIsTicketEditModalOpen(false);
              setSelectedTicket(null);
            }}
            onSubmit={(updateData) => {
              if (selectedTicket) {
                handleUpdateTicket(selectedTicket.id, updateData);
              }
            }}
            onUpdate={() => {
              fetchData(); // ⬅️ refresh data when modal updates a ticket
              setIsTicketEditModalOpen(false);
              setSelectedTicket(null);
            }}
          />
        );
      case "resume_update":
        return (
          <TicketEditModal
            ticket={selectedTicket}
            user={currentUser}
            isOpen={isTicketEditModalOpen}
            assignments={assignments}
            onClose={() => {
              setIsTicketEditModalOpen(false);
              setSelectedTicket(null);
            }}
            onSubmit={(updateData) => {
              if (selectedTicket) {
                handleUpdateTicket(selectedTicket.id, updateData);
              }
            }}
            onTicketUpdated={handleTicketUpdated} // Add this line
          />
        )
      default:
        return null;
    }
  };


  // Function to update a client
  const handleUpdateClient = async (updatedClient: Client) => {
    // Map through the clients array and update the client with the matching id
    setClients(clients.map(client =>
      client.id === updatedClient.id ? updatedClient : client
    ));

    await fetchData();
  };

  // This function takes in a userId and userData and updates the user with the given userId in the users array

  const handleUpdateUser = (userId: string, userData: any) => {
    // Map through the users array and return a new array with the user with the given userId updated with the new userData
    setUsers(users.map(user =>
      user.id === userId ? { ...user, ...userData } : user
    )); ``
  };
  // const createdbyUser = users.find(u => u.id === ticket.createdby);
  // Function to handle deleting a user
  const handleDeleteUser = (userId: string) => {
    // Confirm with the user if they want to delete the user
    if (window.confirm('Are you sure you want to delete this user?')) {
      // Filter out the user with the given userId from the users array
      setUsers(users.filter(user => user.id !== userId));
    }
  };

  // Function to handle ticket click
  const handleTicketClick = (ticket: Ticket) => {
    // Set the selected ticket to the clicked ticket
    setSelectedTicket(ticket);
    // Set the isTicketEditModalOpen state to true
    setIsTicketEditModalOpen(true);
  };

  // Function to handle client edit
  const handleClientEdit = (client: Client) => {
    // Set the selected client to the client passed in as a parameter
    setSelectedClient(client);
    // Set the isClientEditModalOpen state to true
    setIsClientEditModalOpen(true);
  };

  // Function to get dashboard statistics
  const getDashboardStats = (): DashboardStats => {
    const visibleTickets = getVisibleTickets();
    // Filter tickets by status and get the length of each array
    const openTickets = visibleTickets.filter(t => t.status === 'open').length;
    const inProgressTickets = visibleTickets.filter(t => t.status === 'in_progress').length;
    const resolvedTickets = visibleTickets.filter(t => t.status === 'resolved').length;
    const escalatedTickets = visibleTickets.filter(t => t.status === 'escalated').length;
    const criticalTickets = visibleTickets.filter(t => t.priority === 'critical').length;
    // Filter tickets by due date and status and get the length of the array
    const slaBreaches = tickets.filter(t =>
      new Date(t.dueDate) < new Date() && t.status !== 'resolved'
    ).length;

    // Return an object containing the dashboard statistics
    return {
      totalTickets: visibleTickets.length,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      escalatedTickets,
      criticalTickets,
      slaBreaches,
      avgResolutionTime: 18.5,
    };
  };

  const renderMainContent = () => {
    const stats = getDashboardStats();

    switch (activeView) {
      case 'dashboard':
        const isExecutive = currentUser && ['ceo', 'coo', 'cro'].includes(currentUser.role);

        return (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <div className="flex space-x-3">
                {currentUser?.role === 'sales' && (
                  <button
                    onClick={() => setIsClientOnboardingModalOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <UserPlus className="h-5 w-5" />
                    <span>Onboard Client</span>
                  </button>
                )}
                {/* {(currentUser?.role === 'sales' || currentUser?.role == 'account_manager' || currentUser?.role == 'career_associate' || currentUser?.role == 'cro' || currentUser?.role == 'credential_resolution') && ( */}
                {(currentUser?.role == 'account_manager' || currentUser?.role == 'cro') && (
                  <button
                    onClick={() => setIsCreateTicketModalOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Create Ticket</span>
                  </button>
                )}
              </div>
            </div>

            <DashboardStatsComponent
              stats={stats}
              userRole={currentUser?.role || ''}
              onTotalTicketsClick={() => {
                setActiveView('tickets');
                setFilterStatus('all'); // Reset status filter
                setFilterType('all');   // Reset type filter
                setFilterPriority('all');
              }}
              onOpenTicketsClick={() => {
                setActiveView('tickets');
                setFilterStatus('open'); // This will filter to only open tickets
                setFilterType('all'); // Reset type filter
                setFilterPriority('all');
              }}
              onResolvedTicketsClick={() => {
                setActiveView('tickets');
                setFilterStatus('resolved');
                setFilterType('all');
                setFilterPriority('all');
              }}
              onCriticalTicketsClick={() => {
                setActiveView('tickets');
                setFilterStatus('all');
                setFilterType('all');
                setFilterPriority('critical');
              }}
            />
            {isExecutive ? (
              <ExecutiveDashboard user={currentUser!} tickets={getVisibleTickets()} escalations={escalations} />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Tickets</h2>
                  <div className="space-y-4">
                    {getVisibleTickets().slice(0, 5).map(ticket => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleTicketClick(ticket)}
                      >
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{ticket.title}</h3>
                          <p className="text-sm text-gray-600">{ticket.type.replace('_', ' ')}</p>
                        </div>
                        <div className={`px-2 py-1 text-xs font-medium rounded-full ${ticket.priority === 'critical' ? 'bg-red-100 text-red-800' :
                          ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                          {ticket.priority}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveView('tickets')}
                      className="w-full flex items-center space-x-3 p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-900">View All Tickets</span>
                    </button>

                    <button
                      onClick={() => setActiveView('clients')}
                      className="w-full flex items-center space-x-3 p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <Users className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-900">Manage Clients</span>
                    </button>

                    <button
                      onClick={() => setActiveView('reports')}
                      className="w-full flex items-center space-x-3 p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                    >
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-purple-900">View Reports</span>
                    </button>

                    {currentUser?.role === 'system_admin' && (
                      <button
                        onClick={() => setIsUserManagementModalOpen(true)}
                        className="w-full flex items-center space-x-3 p-3 text-left bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                      >
                        <Settings className="h-5 w-5 text-orange-600" />
                        <span className="font-medium text-orange-900">User Management</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'tickets':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
              {currentUser?.role == 'account_manager' && (
                <button
                  onClick={() => setIsCreateTicketModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  <span>Create Ticket</span>
                </button>
              )}
            </div>
            <TicketList
              tickets={getVisibleTickets()}
              user={currentUser!}
              assignments={assignments}
              onTicketClick={handleTicketClick}
              initialFilterStatus={filterStatus} // Pass the filter status
              initialFilterType={filterType} // Pass the filter type
              initialFilterPriority={filterPriority} // Pass the filter priority
            />

          </div>
        );

      case 'clients':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
              {currentUser?.role === 'sales' && (
                <button
                  onClick={() => setIsClientOnboardingModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <UserPlus className="h-5 w-5" />
                  <span>Onboard Client</span>
                </button>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Client Directory</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preferences</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Onboarded</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clients.map(client => (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">{client.full_name}</div>
                            <div className="text-sm text-gray-500">{client.personal_email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{client.whatsapp_number}</div>
                          <div className="text-sm text-gray-500">{client.callable_phone}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{<p className="text-sm text-gray-600">
                            Roles:{" "}
                            {client.job_role_preferences.join(", ")}
                          </p>
                          }</div>
                          <div className="text-sm text-gray-500">{client.salary_range}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{format(new Date(client.created_at), 'yyyy-MM-dd')}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {currentUser?.role == 'career_associate' && (
                            <button
                              onClick={() => handleClientEdit(client)}
                              className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                              <span>View</span>
                            </button>
                          )}
                          {currentUser?.role !== 'career_associate' && (
                            <button
                              onClick={() => handleClientEdit(client)}
                              className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                              <span>Edit</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'user-management':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <button
                onClick={() => setIsUserManagementModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="h-5 w-5" />
                <span>Add User</span>
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">System User</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {user.role.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.department || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => setIsUserManagementModalOpen(true)}
                            className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'reports':
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">SLA Performance</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">On-time Resolution Rate</span>
                    <span className="font-semibold text-green-600">87%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '87%' }}></div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Ticket Volume Trends</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">This Week</span>
                    <span className="font-semibold">{getVisibleTickets().length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Week</span>
                    <span className="font-semibold">23</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Growth</span>
                    <span className="font-semibold text-green-600">+12%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'escalations':
        return (<ExecutiveDashboard user={currentUser!} tickets={tickets} escalations={escalations} />);

      case 'pending_onboarding':
        return (
          <PendingOnboardingList
            pendingClients={pendingClients}
            onAssignRoles={handleAssignRoles}
          />
        );


      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900">Feature Coming Soon</h2>
            <p className="text-gray-600 mt-2">This feature is under development.</p>
          </div>
        );
    }
  };
  // if (window.location.pathname === "/EmailConfirmed") {
  //   return <EmailConfirmed />;
  // }

  // if (window.location.pathname === "/LinkExpired") {
  //   return <LinkExpired />;
  // }

  // if (window.location.pathname === "/email-verify-redirect") {
  //   return <EmailVerifyRedirect />;
  // }

  // if (!currentUser) {
  //   return <LoginForm onLogin={handleLogin} />;
  // }



  return (
    //   <DialogProvider>
    //     <Router>
    //       <Routes>
    //         {/* Add this route configuration */}
    //         <Route path="/EmailVerifyRedirect" element={<EmailVerifyRedirect />} />
    //         <Route path="/LinkExpired" element={<LinkExpired />} />
    //         <Route path="/EmailConfirmed" element={<EmailConfirmed />} />
    //         {/* Add your other routes here
    //         <Route path="/" element={<Home />} />
    //         <Route path="/login" element={<Login />} /> */}
    //         {/* ... other routes */}

    //       </Routes>
    //     </Router>

    //     <div className="min-h-screen bg-gray-50">
    //       <Navbar user={currentUser} onLogout={handleLogout} />

    //       <div className="flex">
    //         <Sidebar
    //           user={currentUser}
    //           activeView={activeView}
    //           onViewChange={setActiveView}
    //         />

    //         <main className="flex-1 p-8">
    //           {renderMainContent()}
    //         </main>
    //       </div>

    // <CreateTicketModal
    //   user={currentUser}
    //   isOpen={isCreateTicketModalOpen}
    //   onClose={() => setIsCreateTicketModalOpen(false)}
    //   onSubmit={handleCreateTicket}
    //   onTicketCreated={fetchData}
    // />

    // {renderTicketEditModal(selectedTicket, "edit")}

    // <ClientOnboardingModal
    //   user={currentUser}
    //   isOpen={isClientOnboardingModalOpen}
    //   onClose={() => setIsClientOnboardingModalOpen(false)}
    //   onClientOnboarded={fetchData}
    // />

    // <ClientEditModal
    //   client={selectedClient}
    //   isOpen={isClientEditModalOpen}
    //   currentUserRole={currentUser.role}
    //   onClose={() => {
    //     setIsClientEditModalOpen(false);
    //     setSelectedClient(null);
    //   }}
    //   onSubmit={handleUpdateClient}
    // />

    // <UserManagementModal
    //   isOpen={isUserManagementModalOpen}
    //   onClose={() => setIsUserManagementModalOpen(false)}
    //   onUpdateUser={handleUpdateUser}
    //   onDeleteUser={handleDeleteUser}
    // />
    //     </div>
    //   </DialogProvider>
    // );
    <DialogProvider>
      <BrowserRouter>
        <Routes>
          {/* Public auth routes */}
          <Route path="/EmailVerifyRedirect" element={<EmailVerifyRedirect />} />
          <Route path="/LinkExpired" element={<LinkExpired />} />
          <Route path="/EmailConfirmed" element={<EmailConfirmed />} />
          {/* Login route */}
          <Route
            path="/login"
            element={
              !currentUser
                ? (<LoginForm onLogin={handleLogin} />)
                : (<Navigate to="/" replace />)
            }
          />
          {/* Protected main app routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute currentUser={currentUser}>
                <AppLayout
                  currentUser={currentUser}
                  activeView={activeView}
                  setActiveView={setActiveView}
                  renderMainContent={renderMainContent}
                  renderTicketEditModal={renderTicketEditModal}
                  isCreateTicketModalOpen={isCreateTicketModalOpen}
                  setIsCreateTicketModalOpen={setIsCreateTicketModalOpen}
                  isClientOnboardingModalOpen={isClientOnboardingModalOpen}
                  setIsClientOnboardingModalOpen={setIsClientOnboardingModalOpen}
                  isClientEditModalOpen={isClientEditModalOpen}
                  setIsClientEditModalOpen={setIsClientEditModalOpen}
                  isUserManagementModalOpen={isUserManagementModalOpen}
                  setIsUserManagementModalOpen={setIsUserManagementModalOpen}
                  selectedTicket={selectedTicket}
                  selectedClient={selectedClient}
                  setSelectedClient={setSelectedClient}
                  handleLogout={handleLogout}
                  handleCreateTicket={handleCreateTicket}
                  handleUpdateClient={handleUpdateClient}
                  handleUpdateUser={handleUpdateUser}
                  handleDeleteUser={handleDeleteUser}
                  fetchData={fetchData}
                />
              </ProtectedRoute>
            }
          />

        </Routes>
      </BrowserRouter>
    </DialogProvider>
  );
}


export default App;