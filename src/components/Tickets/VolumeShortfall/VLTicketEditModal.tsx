import React, { useState, useEffect } from 'react';
import { X, Clock, User, AlertTriangle, CheckCircle, MessageSquare, Calendar, Heading4 } from 'lucide-react';
import { Ticket, User as UserType, TicketStatus } from '../../../types';
import { ticketTypeLabels } from '../../../data/mockData';
import { format } from 'date-fns';
import { supabase } from '../../../lib/supabaseClient';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
// import { toast } from 'react-hot-toast';



interface AssignedUser {
  id: string;
  name: string;
  role: string;
}

interface TicketEditModalProps {
  ticket: Ticket | null;
  user: UserType;
  isOpen: boolean;
  assignments: Record<string, AssignedUser[]>;
  onClose: () => void;
  onSubmit: (ticketData: any) => void;
  onUpdate: () => void;
}



export const VLTicketEditModal: React.FC<TicketEditModalProps> = ({
  ticket,
  user,
  isOpen,
  assignments,
  onClose,
  onSubmit,
  onUpdate
}) => {
  // State variables to store ticket status, comment, resolution, and escalation reason
  const [status, setStatus] = useState<TicketStatus>('open');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientName, setClientName] = useState<string>('');
  const [resolution, setResolution] = useState('');
  const [ticketFiles, setTicketFiles] = useState<any[]>([]);
  // const [createdBy, setCreatedBy] = useState<string>('');
  const [createdByUser, setCreatedByUser] = useState<any>(null);
  // const userId = ticket.createdBy;

  const [userComment, setUserComment] = useState('');
  const [userFile, setUserFile] = useState<File | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [alreadyAssignedIds, setAlreadyAssignedIds] = useState(new Set<string>());

  const [comment, setComment] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const currentUserRole = user?.role;
  const currentUserId = user?.id;
  const [ticketComments, setTicketComments] = useState<any[]>([]);
  const [resolutionComment, setResolutionComment] = useState('');
  const [resolutionFile, setResolutionFile] = useState<File | null>(null);
  const [volumeShortfallData, setVolumeShortfallData] = useState<any>([]);
  const [wantsToEscalate, setWantsToEscalate] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      if (!ticket?.createdby) return;

      const { data, error } = await supabase
        .from('users')
        .select('name ,role')
        .eq('id', ticket.createdby)
        .single();

      // console.log('Fetching data d', data);
      if (error) {
        console.error('Error fetching user name:', error);
      } else {
        setCreatedByUser(data?.name || '');
      }
    };

    fetchUser();
    // console.log('Fetching ticket',ticket);
  }, [ticket ? ticket.createdby : null]);

  const fetchTicketFiles = async () => {
    if (!ticket?.id) return; // ✅ Fix: skip if ticket is null/undefined

    const { data, error } = await supabase
      .from('ticket_files')
      .select(`
      id,
      file_path,
      uploaded_at,
      users:uploaded_by (
        id,
        name
      )
    `)
      .eq('ticket_id', ticket.id)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching ticket files:', error);
    } else {
      setTicketFiles(data || []);
    }
  };
  const fetchVolumeShortfallDetails = async () => {
    if (ticket?.type !== 'volume_shortfall') return;

    const { data, error } = await supabase
      .from('volume_shortfall_tickets')
      .select('*')
      .eq('ticket_id', ticket.id)
      .single();

    if (error) {
      console.error('Failed to fetch volume shortfall details:', error.message);
    } else {
      setVolumeShortfallData(data);
    }
  };

  useEffect(() => {
    if (ticket) {
      // Set the ticket status to the current ticket's status
      setStatus(ticket.status);
      // Reset the comment, resolution, and escalation reason
      setComment('');
      setResolution('');
      setEscalationReason('');
      fetchTicketFiles();
      fetchVolumeShortfallDetails();
    }

  }, [ticket]);

  useEffect(() => {
    const fetchClientName = async () => {
      if (!ticket) return;
      if (!ticket.clientId) return;

      const { data, error } = await supabase
        .from('clients')
        .select('full_name')
        .eq('id', ticket.clientId)
        .single(); // because only one client expected

      // console.log('Fetching client', data);
      if (error) {
        console.error('Error fetching client name:', error);
      } else {
        setClientName(data?.full_name || '');
      }
    };

    fetchClientName();
  }, [ticket ? ticket.clientId : null]);

  useEffect(() => {
    const fetchTicketActivity = async () => {
      if (!ticket || !ticket.id) return;

      // Fetch Comments
      const { data: comments, error: commentError } = await supabase
        .from('ticket_comments')
        .select(`
    content,
    created_at,
    user_id,
    is_internal,
    users (
      name,
      role
    )
  `)
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      if (commentError) console.error('Error fetching comments:', commentError);
      else setTicketComments(comments || []);

      // Fetch Files
      const { data: files, error: fileError } = await supabase
        .from('ticket_files')
        .select('file_path, uploaded_at, uploaded_by')
        .eq('ticket_id', ticket.id)
        .order('uploaded_at', { ascending: true });

      if (fileError) console.error('Error fetching files:', fileError);
      else setTicketFiles(files || []);
    };

    fetchTicketActivity();
  }, [ticket]);

  useEffect(() => {
    const fetchTicketAssignments = async () => {
      if (!ticket?.id) return;

      const { data, error } = await supabase
        .from('ticket_assignments')
        .select('user_id')
        .eq('ticket_id', ticket.id);

      if (error) {
        console.error('Failed to fetch ticket assignments:', error);
        return;
      }

      const assignedIds = new Set(data.map(assignment => assignment.user_id));
      setAlreadyAssignedIds(assignedIds);
    };

    fetchTicketAssignments();
  }, [ticket?.id]);

  const handleCloseTicket = async () => {
    if (!ticket) return;
    if (!ticket.id || !user?.id) return;
    if (!comment && !file) {
      alert("Please write a comment or attach a file to close this ticket.");
      return;
    }
    setIsSubmittingComment(true);
    try {
      setIsUploading(true);
      let uploadedFilePath: string | null = null;

      if (file) {
        // Upload file to Supabase storage
        const filePath = `${ticket.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(filePath, file);

        if (uploadError) {
          console.error("File upload failed:", uploadError);
          alert("File upload failed.");
          return;
        }
        uploadedFilePath = filePath;
      }

      // Insert comment with status at time
      if (comment.trim() !== '') {
        await supabase.from('ticket_comments').insert([
          {
            ticket_id: ticket.id,
            user_id: currentUserId,
            content: comment,
            is_internal: false,
            ticketStatusAtTime: 'closed',
          },
        ]);
      }

      // Save file reference
      if (uploadedFilePath) {
        const { error: insertError } = await supabase.from('ticket_files').insert([
          {
            ticket_id: ticket.id,
            uploaded_by: currentUserId,
            file_path: uploadedFilePath,
            uploaded_at: new Date().toISOString(),
          },
        ]);
        if (insertError) {
          console.error("Failed to record uploaded file:", insertError);
          alert("Error saving file info.");
          return;
        }
      }

      // Update ticket status
      const { error } = await supabase.from('tickets').update({
        status: 'closed',
        updatedAt: new Date().toISOString(),
      }).eq('id', ticket.id);
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('careerassociateid')
        .eq('id', ticket.clientId)
        .single();

      if (clientError) {
        console.error("Failed to fetch client info:", clientError);
        alert("Could not get assigned users for this client.");
        return;
      }

      const { careerassociateid } = clientData;
      if (
        ticket?.type === 'volume_shortfall' &&
        ticket?.status === 'replied' &&
        user?.role === 'ca_team_lead' &&
        wantsToEscalate &&
        escalationReason.trim().length > 0
      ) {
        const { error: escalationError } = await supabase
          .from('ticket_escalations')
          .insert([{
            ticket_id: ticket.id,
            escalated_by: user.id,
            ca_id: careerassociateid, // assumes client info is already loaded
            reason: escalationReason.trim(),
          }]);

        if (escalationError) {
          console.error("Escalation insert failed:", escalationError.message);
          toast.error("Failed to escalate CA. Ticket was closed, but escalation not saved.");
        } else {
          toast.success("Escalation raised on CA successfully.");
        }
      }

      alert("Ticket closed successfully!");
      onUpdate?.(); // notify parent component of update
      setUserComment('');
      setUserFile(null);
      onClose(); // close modal
    } catch (error) {
      console.error(error);
      alert("Failed to close ticket.");
    } finally {
      setIsUploading(false);
      setIsSubmittingComment(false);
    }
  };

  const handleForwardTicket = async () => {

    setIsSubmittingComment(true);
    try {
      if (!ticket) return;
      if (!ticket.clientId) {
        alert("Client ID missing from ticket.");
        return;
      }
      // Insert comment with status at time
      if (comment && comment.trim() !== '') {
        await supabase.from('ticket_comments').insert([
          {
            ticket_id: ticket.id,
            user_id: currentUserId,
            content: comment,
            is_internal: false,
            ticketStatusAtTime: 'closed',
          },
        ]);
      }
      // Step 1: Fetch assigned CA and Scraper from client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('careerassociateid, scraperid')
        .eq('id', ticket.clientId)
        .single();

      if (clientError) {
        console.error("Failed to fetch client info:", clientError);
        alert("Could not get assigned users for this client.");
        return;
      }

      const { careerassociateid, scraperid } = clientData;

      if (!careerassociateid && !scraperid) {
        alert("No CA or Scraper assigned for this client.");
        return;
      }

      // Step 2: Fetch existing ticket assignments
      const { data: existingAssignments, error: fetchError } = await supabase
        .from('ticket_assignments')
        .select('user_id')
        .eq('ticket_id', ticket.id);

      if (fetchError) {
        console.error("Failed to fetch existing assignments:", fetchError);
        return;
      }

      const alreadyAssignedIds = new Set(existingAssignments?.map(a => a.user_id));

      const newAssignments = [];
      if (careerassociateid && !alreadyAssignedIds.has(careerassociateid)) {
        newAssignments.push({
          ticket_id: ticket.id,
          user_id: careerassociateid,
          assignedBy: user?.id,
        });
      }
      if (scraperid && !alreadyAssignedIds.has(scraperid)) {
        newAssignments.push({
          ticket_id: ticket.id,
          user_id: scraperid,
          assignedBy: user?.id,
        });
      }

      // Step 3: Insert only new assignments
      if (newAssignments.length > 0) {
        const { error: insertError } = await supabase
          .from('ticket_assignments')
          .insert(newAssignments);

        if (insertError) {
          console.error("Failed to assign users:", insertError);
          alert("Error while assigning new users.");
          return;
        }
      }
      else {
        alert("Ticket already forwarded to CA and Scraping Team.");
      }

      // Step 4: Update ticket status
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          status: 'forwarded',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', ticket.id);

      const { error: updateErrorInVolumeShotfallTickes } = await supabase
        .from("volume_shortfall_tickets")
        .update({
          forwarded_to_ca_scraping: true,
          updated_at: new Date().toISOString()
        })
        .eq("ticket_id", ticket.id);


      if (updateError || updateErrorInVolumeShotfallTickes) {
        console.error("Failed to update ticket status:", updateError);
        // alert("Could not update ticket status.");
        return;
      }
      else {
        alert("Ticket successfully forwarded to CA and Scraping Team.");
      }
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("Unexpected error occurred while forwarding.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!ticket) return;
    if (!ticket.id || !user?.id) return;
    if (!userComment && !userFile) {
      alert("Please write a comment or attach a file.");
      return;
    }

    setIsSubmittingComment(true);

    try {
      // Step 1: Upload file if provided
      let uploadedFilePath: string | null = null;

      if (userFile) {
        const filePath = `${ticket.id}/${Date.now()}-${userFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(filePath, userFile);

        if (uploadError) {
          console.error("Upload failed:", uploadError);
          alert("File upload failed.");
          return;
        }
        uploadedFilePath = filePath;
      }

      // Step 2: Insert comment (if text provided)
      if (userComment.trim() !== '') {
        await supabase.from('ticket_comments').insert([
          {
            ticket_id: ticket.id,
            user_id: user.id,
            content: userComment,
            ticketStatusAtTime: ticket.status,
            is_internal: false,
          }
        ]);
      }

      // Step 3: Insert ticket_files (if file uploaded)
      if (uploadedFilePath) {
        await supabase.from('ticket_files').insert([
          {
            ticket_id: ticket.id,
            file_path: uploadedFilePath,
            uploaded_by: user.id,
          }
        ]);
      }
      onUpdate?.();
      alert("Comment submitted successfully.");
      setUserComment('');
      setUserFile(null);
      onClose();
    } catch (err) {
      console.error("Error submitting comment:", err);
      alert("Failed to submit comment.");
    } finally {
      setIsSubmittingComment(false);
    }
    // ✅ Only proceed if this is a volume_shortfall ticket that was forwarded
    if (ticket.type === 'volume_shortfall' && ticket.status === 'forwarded') {
      try {
        // 1. Fetch all comments for this ticket
        const { data: comments, error: commentError } = await supabase
          .from('ticket_comments')
          .select('user_id')
          .eq('ticket_id', ticket.id);

        if (commentError) throw commentError;

        const uniqueUserIds = new Set<string>(comments.map(c => c.user_id).filter(Boolean));

        // const uniqueUserIds = [...new Set(comments.map(c => c.user_id).filter(Boolean))];

        // 2. Get the roles of all users who commented
        const { data: userRoles, error: userError } = await supabase
          .from('users')
          .select('id, role')
          .in('id', Array.from(uniqueUserIds));

        // .in('id', uniqueUserIds);

        if (userError) throw userError;

        const hasCA = userRoles.some(u => u.role === 'career_associate');
        const hasScraper = userRoles.some(u => u.role === 'scraping_team');

        if (hasCA && hasScraper) {
          // ✅ 3. Get CA Team Lead from the clients table using clientId
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('careerassociatemanagerid')
            .eq('id', ticket.clientId)
            .single();

          if (clientError || !clientData?.careerassociatemanagerid) {
            throw clientError || new Error("CA Team Lead not found for client");
          }

          const caManagerId = clientData.careerassociatemanagerid;

          // ✅ 4. Update ticket status to 'replied'
          const updateRes = await supabase
            .from('tickets')
            .update({
              status: 'replied',
              updatedAt: new Date().toISOString()
            })
            .eq('id', ticket.id);

          // ✅ 5. Insert (or skip) ticket assignment to CA Team Lead
          const { error: assignError } = await supabase
            .from('ticket_assignments')
            .upsert([
              {
                ticket_id: ticket.id,
                user_id: caManagerId,
                assignedBy: user.id // current user
              }
            ], { onConflict: 'ticket_id,user_id' });

          if (updateRes.error || assignError) {
            throw updateRes.error || assignError;
          }

          onUpdate?.();
          console.log('✅ Ticket auto-updated to replied and reassigned to CA Team Lead.');
        }
      } catch (err) {
        console.error('❌ Auto-update failed:', err.message || err);
      }
    }

  };

  const handleResolveTicket = async () => {
    if (!ticket || !ticket.id || !user?.id) return;
    if (!resolutionComment && !resolutionFile) {
      alert("Please write a resolution comment or attach a resolution file.");
      return;
    }
    try {
      // 1. Upload file (if exists)
      let filePath = null;

      if (resolutionFile) {
        const path = `${ticket.id}/${Date.now()}-${resolutionFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(path, resolutionFile);

        if (uploadError) {
          alert("File upload failed.");
          return;
        }

        filePath = path;

        const { error: insertFileError } = await supabase
          .from('ticket_files')
          .insert({
            ticket_id: ticket.id,
            file_path: path,
            uploaded_by: user.id,
          });

        if (insertFileError) {
          console.error("Failed to save file path:", insertFileError);
        }
      }

      // 2. Add resolution comment
      if (resolutionComment.trim()) {
        const { error: commentError } = await supabase.from('ticket_comments').insert({
          ticket_id: ticket.id,
          user_id: user.id,
          content: resolutionComment,
          is_internal: false,
        });

        if (commentError) {
          console.error("Failed to save comment:", commentError);
          alert("Failed to save comment.");
          return;
        }
      }

      // 3. Update ticket status to resolved
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ status: 'resolved', updatedAt: new Date().toISOString() })
        .eq('id', ticket.id);

      if (updateError) {
        alert("Failed to update ticket status.");
        return;
      }

      alert("Ticket resolved.");
      onUpdate?.();
      setResolutionComment('');
      setResolutionFile(null);
      onClose();
    } catch (error) {
      console.error("Resolution error:", error);
      alert("Unexpected error during resolution.");
    }
  };

  // If the modal is not open or there is no ticket, return null
  if (!isOpen || !ticket) return null;

  // Function to handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Create an object to store the updated ticket data
    const updateData = {
      status,
      comment,
      resolution,
      escalationReason,
      updatedBy: user.id,
      updatedAt: new Date(),
    };

    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${ticket.id}/${user.id}/${Date.now()}.${fileExt}`;

      // ✅ Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false, // avoid overwriting accidentally
        });

      if (uploadError) {
        console.error('File upload failed:', uploadError.message);
        alert('File upload failed: ' + uploadError.message);
        return;
      }

      // ✅ Store file record in DB
      const { error: insertError } = await supabase.from('ticket_files').insert({
        ticket_id: ticket.id,
        uploaded_by: user.id,
        file_path: fileName,
      });

      if (insertError) {
        console.error('Error saving file info in DB:', insertError.message);
        alert('Failed to store file info in database.');
        return;
      }

      await fetchTicketFiles(); // refresh file list
      setSelectedFile(null);
    }
    // Call the onSubmit function with the updated ticket data
    onSubmit(updateData);
    setSelectedFile(null);
    // Close the modal
    onClose();
  };


  // Function to check if the user can edit the ticket
  const canEdit = () => {
    // Check if user can edit this ticket based on role and assignment
    if (user.role === 'cro' || user.role === 'coo' || user.role === 'ceo') return true;
    if (alreadyAssignedIds.has(user?.id)) return true;
    if (user.role === 'ca_team_lead' && ticket.type === 'volume_shortfall') return true;
    if (user.role === 'account_manager' && ticket.type === 'volume_shortfall') return true;
    return false;
  };

  // Function to get the color of the ticket status
  const getStatusColor = (status: TicketStatus) => {
    const colors = {
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      escalated: 'bg-red-100 text-red-800',
      closed: 'bg-gray-100 text-gray-800',
      forwarded: 'bg-yellow-100 text-yellow-800',
      replied: 'bg-orange-100 text-orange-800',
    };
    return colors[status];
  };

  // Calculate the time until the ticket is due
  const timeUntilDue = new Date(ticket.dueDate).getTime() - new Date().getTime();
  // Check if the ticket is overdue
  const isOverdue = timeUntilDue < 0;
  // Calculate the number of hours remaining until the ticket is due
  const hoursRemaining = Math.abs(Math.floor(timeUntilDue / (1000 * 60 * 60)));

  let metadata = {};

  try {
    metadata =
      typeof ticket.metadata === 'string'
        ? JSON.parse(ticket.metadata)
        : ticket.metadata
  } catch (e) {
    console.error('Invalid metadata JSON:', ticket.metadata);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Ticket Details & Actions</h2>
            <p className="text-sm text-gray-600">Editing as: {user.name} ({user.role.replace('_', ' ').toUpperCase()})</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Ticket Information */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Ticket Information</h3>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                  {ticket.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${ticket.priority === 'critical' ? 'bg-red-100 text-red-800' :
                  ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                  {ticket.priority.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Client name</label>
                  <p className="text-gray-900">{clientName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Ticket ID</label>
                  <p className="text-gray-900">{ticket.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <p className="text-gray-900">{ticketTypeLabels[ticket.type]}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Title</label>
                  <p className="text-gray-900">{ticket.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-900">{ticket.description}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created By</label>
                  <p className="text-gray-900">{createdByUser} </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Ticket Sort Code</label>
                  <p className="text-gray-900">{ticket.short_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Assigned To</label>
                  <div className="space-y-1">
                    {' '}
                    {assignments[ticket.id]?.length
                      ? assignments[ticket.id].map((u, i) => (
                        <span key={u.id}>
                          {u.name} ({u.role?.replace('_', ' ') || 'Unknown Role'})
                          {i < assignments[ticket.id].length - 1 && ', '}
                        </span>
                      ))
                      : 'Unassigned'}
                    {/*assignedUsers.map(user => (
                      <p key={user.id} className="text-gray-900">{user.name} ({user.role.replace('_', ' ')})</p>
                    ))*/}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created At</label>
                  <p className="text-gray-900">{format(new Date(ticket.createdat), 'yyyy-MM-dd hh:mm a')}</p>
                </div>
                {ticket.status !== 'resolved' ? (
                  <div>
                    <label className="text-sm font-medium text-gray-500">SLA Status</label>
                    <div className={`flex items-center space-x-2 ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                      {isOverdue ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                      <span className="font-medium">
                        {isOverdue ? `${hoursRemaining}h overdue` : `${hoursRemaining}h remaining`}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>


          {/* Ticket Metadata */}

          {Object.keys(metadata).length > 0 && (
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Ticket Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(metadata).map(([key, value]) => (
                  <div key={key}>
                    <label className="text-sm font-medium text-blue-700">
                      {key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, (str) => str.toUpperCase())}
                    </label>
                    <p className="text-blue-900">
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {currentUserRole === 'ca_team_lead' && ticket.type === 'volume_shortfall' && volumeShortfallData?.forwarded_to_ca_scraping && (
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-300 mt-4">
              <h3 className="text-md font-semibold mb-2 text-yellow-900">Volume Shortfall Extra Fields</h3>
              <p>
                <strong>Forwarded to CA & Scraping:</strong>{' '}
                {volumeShortfallData?.forwarded_to_ca_scraping ? '✅ Yes' : '❌ No'}
              </p>
            </div>
          )}

          {/* --- Comments --- */}
          {ticketComments.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-md font-semibold mb-2">Comments:</h3>
              <ul className="space-y-3">
                {ticketComments.map((comment, index) => (
                  <li key={index} className="bg-gray-50 p-3 rounded border text-sm">
                    <div className="text-gray-700">
                      {comment.content}
                      {' '}<span className="text-gray-600 italic">
                        — {comment.users?.name || 'Unknown'} ({comment.users?.role?.replace('_', ' ') || 'Unknown Role'})
                      </span>
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      {new Date(comment.created_at).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* --- Files --- */}
          {ticketFiles.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-md font-semibold mb-2">Uploaded Files:</h3>
              <ul className="space-y-2 text-sm">
                {ticketFiles.map((file, index) => (
                  <li key={index}>
                    <a
                      href={`https://ogwiuvxvhblhqmdsncyg.supabase.co/storage/v1/object/public/ticket-attachments/${file.file_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {file.file_path.split('/').pop()}
                    </a>{' '}
                    <span className="text-gray-400 text-xs">
                      ({new Date(file.uploaded_at).toLocaleString()})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ticketFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="text-md font-semibold text-gray-800 mb-2">Uploaded Files</h3>
              <ul className="space-y-2">
                {ticketFiles.map((file) => {
                  const fileUrl = supabase.storage.from('ticket-attachments').getPublicUrl(file.file_path).data.publicUrl;

                  return (
                    <li key={file.id} className="text-sm text-blue-800 underline">
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                        {file.file_path.split('/').pop()}
                      </a>
                      <span className="ml-2 text-gray-500">
                        (Uploaded by: {file.users?.name || 'Unknown'} on {new Date(file.uploaded_at).toLocaleDateString()})
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}


          {/* Action Form */}
          {canEdit() &&
            (
              <form onSubmit={handleSubmit} className="space-y-6">
                {currentUserRole === 'ca_team_lead' && ticket.type === 'volume_shortfall' && (ticket.status === 'open' || ticket.status === 'replied') && (
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <h3 className="text-lg font-semibold text-green-900 mb-4">Take Action</h3>
                    <div className="space-y-4 mt-6">
                      <textarea
                        className="w-full border p-2 rounded"
                        placeholder="Add a comment before closing"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        required
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Upload File</label>
                        <input
                          type="file"
                          onChange={(e) => setUserFile(e.target.files?.[0] || null)}
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="block w-full border rounded px-3 py-2"
                        />
                      </div>
                      <button onClick={handleCloseTicket} disabled={isSubmittingComment} className="bg-red-500 text-white px-4 py-2 rounded">
                        {isSubmittingComment ? 'Closing ticket...' : 'Close Ticket '}
                      </button>
                      <button onClick={handleForwardTicket} className="bg-blue-500 text-white px-4 py-2 rounded ml-4">
                        {isSubmittingComment ? ' Forwarding to CA & Scraping Team ... ' : ' Forward to CA & Scraping Team '}
                      </button>
                    </div>
                  </div>
                )}
                {user?.role === 'ca_team_lead' &&
                  ticket?.type === 'volume_shortfall' &&
                  ticket?.status === 'replied' && (
                    <div className="bg-red-50 border border-red-300 rounded-lg p-4 mt-4">
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={wantsToEscalate}
                          onChange={(e) => setWantsToEscalate(e.target.checked)}
                        />
                        <span className="text-red-700 font-medium">Escalate CA for this ticket</span>
                      </label>
                      {wantsToEscalate && (
                        <textarea
                          value={escalationReason}
                          onChange={(e) => setEscalationReason(e.target.value)}
                          placeholder="Write reason for escalation"
                          className="w-full p-2 border border-gray-300 rounded"
                          rows={3}
                        />
                      )}
                    </div>
                  )}

                {['career_associate', 'scraping_team'].includes(user?.role) && ticket.type === 'volume_shortfall' && ticket.status === 'forwarded' && (

                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <h3 className="text-lg font-semibold text-green-900 mb-4">Take Action</h3>
                    <div className="mt-6 border-t pt-6">
                      <h3 className="text-md font-semibold mb-2">Reply with your comment and file:</h3>

                      <textarea
                        className="w-full border p-2 rounded mb-3"
                        placeholder="Add your comment..."
                        value={userComment}
                        onChange={(e) => setUserComment(e.target.value)}
                      />

                      <input
                        type="file"
                        onChange={(e) => setUserFile(e.target.files?.[0] || null)}
                        className="mb-4"
                      />

                      <button
                        onClick={handleCommentSubmit}
                        disabled={isSubmittingComment}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        {isSubmittingComment ? 'Submitting...' : 'Submit Comment'}
                      </button>
                    </div>
                  </div>
                )}
                {['account_manager', 'coo', 'cro', 'ceo'].includes(user.role) &&
                  ticket.type === 'volume_shortfall' &&
                  ticket.status === 'closed' && (
                    <div className="mt-6 border-t pt-4">
                      <h3 className="text-md font-semibold mb-2 text-gray-800">Resolve Ticket</h3>

                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Final Comment
                      </label>
                      <textarea
                        value={resolutionComment}
                        onChange={(e) => setResolutionComment(e.target.value)}
                        rows={4}
                        className="w-full border px-3 py-2 rounded-lg"
                        placeholder="Add a final note before resolving..."
                        required
                      />

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Optional File Upload</label>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setResolutionFile(e.target.files[0]);
                            }
                          }}
                        />
                      </div>

                      <button
                        className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                        onClick={handleResolveTicket}
                      >
                        Resolve Ticket
                      </button>
                    </div>
                  )
                }

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

          {!canEdit() && (
            <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <p className="text-yellow-800">You don't have permission to edit this ticket. You can only view the details.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};