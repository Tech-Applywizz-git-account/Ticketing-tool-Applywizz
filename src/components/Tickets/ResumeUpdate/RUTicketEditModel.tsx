import React, { useState, useEffect } from 'react';
import { X, Clock, User, AlertTriangle, CheckCircle, MessageSquare, Calendar } from 'lucide-react';
import { Ticket, User as UserType, TicketStatus } from '../../../types';
import { ticketTypeLabels } from '../../../data/mockData';
import { format } from 'date-fns';
import { supabase } from '../../../lib/supabaseClient'

interface AssignedUser {
  id: string;
  name: string;
}

interface TicketEditModalProps {
  ticket: Ticket | null;
  user: UserType;
  isOpen: boolean;
  assignments: Record<string, AssignedUser[]>;
  onClose: () => void;
  onSubmit: (ticketData: any) => void;
  onTicketUpdated?: () => void;
}

export const TicketEditModal: React.FC<TicketEditModalProps> = ({
  ticket,
  user,
  isOpen,
  assignments,
  onClose,
  onSubmit,
  onTicketUpdated
}) => {
  // State variables to store ticket status, comment, resolution, and escalation reason
  const [status, setStatus] = useState<TicketStatus>('open');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientName, setClientName] = useState<string>('');
  const [resolution, setResolution] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  const [ticketFiles, setTicketFiles] = useState<any[]>([]);
  // const [createdBy, setCreatedBy] = useState<string>('');
  const [createdByUser, setCreatedByUser] = useState<any>(null);
  // const userId = ticket.createdBy;
  // Add these to existing state variables
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeComment, setResumeComment] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);

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
  const [managerComment, setManagerComment] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [isSendingBack, setIsSendingBack] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<TicketStatus>(ticket?.status || 'open');
  // const [localTicket, setLocalTicket] = useState(ticket);
  const [localTicket, setLocalTicket] = useState<Ticket | null>(ticket);
  const [userNameMap, setUserNameMap] = useState<Record<string, string>>({});
  // ...other state declarations

  const [latestResumeUpdate, setLatestResumeUpdate] = useState<{
    message: string;
    fileUrl: string | null;
    fileName: string | null;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && ticket) {
      setLocalTicket(ticket);
    }
  }, [isOpen, ticket?.id]);


  useEffect(() => {
    const fetchUsers = async () => {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name');

      if (error) {
        console.error('Error fetching users:', error);
      } else {
        const nameMap = users.reduce((acc, user) => {
          acc[user.id] = user.name;
          return acc;
        }, {} as Record<string, string>);
        setUserNameMap(nameMap);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      if (!ticket?.createdby) return;

      const { data, error } = await supabase
        .from('users')
        .select('name')
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

  useEffect(() => {
    if (ticketFiles.length > 0) {
      const { data } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(ticketFiles[0].file_path);
      setDownloadUrl(data.publicUrl);
    }
  }, [ticketFiles]);

  useEffect(() => {
    if (ticket) {
      setCurrentStatus(ticket.status);
      setStatus(ticket.status);
      fetchTicketFiles();
    }
  }, [ticket]);



  useEffect(() => {
    const updateStatusIfResumeTeamLead = async () => {
      if (ticket && ticket.type === 'resume_update' &&
        user.role === 'resume_team' &&
        ticket.status === 'open') {
        await supabase.from('tickets').update({
          status: 'in_progress',
          updatedAt: new Date().toISOString()
        }).eq('id', ticket.id);

        // Refresh ticket data
        // You might need to add a way to refresh the ticket prop
      }
    };

    updateStatusIfResumeTeamLead();
  }, [ticket, user]);

  useEffect(() => {
    if (ticket) {
      // Set the ticket status to the current ticket's status
      setStatus(ticket.status);
      // Reset the comment, resolution, and escalation reason
      setComment('');
      setResolution('');
      setEscalationReason('');


      fetchTicketFiles();
    }

  }, [ticket]);
  // const {
  //   data: { session },
  //   error: sessionError,
  // } = await supabase.auth.getSession();

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

      // const { data: commentuser, error: commentuserError } = await supabase
      //   .from('users')
      //   .select('name,role')
      //   .eq('id', comments?.user_id)
      // if (commentuserError) console.error('Error fetching comments:', commentError);
      // else setTicketComments(commentuser || []);

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

    try {
      await supabase.from('tickets').update({
        status: 'closed',
        updatedAt: new Date().toISOString()
      }).eq('id', ticket.id);

      setCurrentStatus('closed');
      alert("Ticket closed successfully!");

    } catch (error) {
      console.error("Error closing ticket:", error);
    }
  };

  const handleSendBackToResumeTeam = async () => {
    if (!ticket || !managerComment.trim()) {
      alert("Please provide feedback for the Resume Team");
      return;
    }

    try {
      setIsSendingBack(true);

      // Add feedback comment
      await supabase.from('ticket_comments').insert({
        ticket_id: ticket.id,
        user_id: user.id,
        content: managerComment,
        is_internal: false,
        ticketStatusAtTime: 'open' // Also update this to reflect correct status
      });

      // Assign back to Resume Team Lead
      const { data: resumeLead } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'resume_team_lead')
        .single();

      if (resumeLead) {
        await supabase.from('ticket_assignments').insert({
          ticket_id: ticket.id,
          user_id: resumeLead.id,
          assignedBy: user.id
        });
      }

      // Update ticket status - THIS IS THE CRITICAL CHANGE
      await supabase.from('tickets').update({
        status: 'open', // Changed from 'in_progress' to 'open'
        updatedAt: new Date().toISOString()
      }).eq('id', ticket.id);

      setCurrentStatus('open');
      setStatus('open');

      alert("Ticket sent back to Resume Team with your feedback!");
      setManagerComment('');
      if (onTicketUpdated) onTicketUpdated();
    } catch (error) {
      console.error("Error sending back ticket:", error);
      alert("Failed to send back ticket");
    } finally {
      setIsSendingBack(false);
    }
  };

  const handleForwardToAccountManager = async () => {
    if (!ticket) return;
    setIsForwarding(true);
    let uploadSuccess = false;
    let fileUrl = '';
    let fileName = '';

    try {
      // 1. Upload file if exists
      if (resumeFile) {
        const filePath = `${ticket.id}/${Date.now()}_${resumeFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(filePath, resumeFile);

        if (!uploadError) {
          uploadSuccess = true;
          fileUrl = supabase.storage.from('ticket-attachments').getPublicUrl(filePath).data.publicUrl;
          fileName = resumeFile.name;

          // Save file reference to database
          await supabase.from('ticket_files').insert({
            ticket_id: ticket.id,
            uploaded_by: user.id,
            file_path: filePath,
          });
        }
      }

      // 2. Add comment (even if file upload failed)
      const commentContent = uploadSuccess
        ? `${resumeComment} [Attached file: ${fileName}]`
        : `[FILE UPLOAD FAILED] ${resumeComment}`;

      await supabase.from('ticket_comments').insert({
        ticket_id: ticket.id,
        user_id: user.id,
        content: commentContent,
        is_internal: false,
        ticketStatusAtTime: ticket.status
      });

      // 3. Update latest resume update state
      setLatestResumeUpdate({
        message: resumeComment,
        fileUrl: uploadSuccess ? fileUrl : null,
        fileName: uploadSuccess ? fileName : null,
        timestamp: new Date().toISOString()
      });

      // 4. Update ticket status and assign to AM
      await supabase.from('tickets').update({
        status: 'in_progress',
        updatedAt: new Date().toISOString(),
      }).eq('id', ticket.id);

      await supabase.from('ticket_assignments').insert({
        ticket_id: ticket.id,
        user_id: ticket.createdby,
        assignedBy: user.id
      });

      // 5. Refresh data
      setTimeout(async () => {
        const { data: updatedTicket, error } = await supabase
          .from('tickets')
          .select('*')
          .eq('id', ticket.id)
          .single();

        if (!error && updatedTicket) {
          setLocalTicket(updatedTicket);
          setCurrentStatus(updatedTicket.status);
        }

        alert(uploadSuccess
          ? "Resume and notes forwarded to Account Manager!"
          : "Message sent (file upload failed)");
      }, 800);

      if (onTicketUpdated) onTicketUpdated();
    } catch (error) {
      console.error("Forwarding failed:", error);
      alert("Something went wrong.");
    } finally {
      setIsForwarding(false);
    }
  };

  const handleResumeAcknowledgement = async () => {
    if (!ticket) return;

    try {
      // Step 1: Add acknowledgment comment
      await supabase.from('ticket_comments').insert({
        ticket_id: ticket.id,
        user_id: user.id,
        content: `${user.role.replace('_', ' ')} acknowledged resume update.`,
        is_internal: false,
        ticketStatusAtTime: ticket.status
      });

      // Step 2: Check how many unique roles have acknowledged
      const { data: allComments } = await supabase
        .from('ticket_comments')
        .select('user_id')
        .eq('ticket_id', ticket.id);

      const rolesSet = new Set<string>();

      for (const comment of allComments || []) {
        const { data: roleUser } = await supabase
          .from('users')
          .select('role')
          .eq('id', comment.user_id)
          .single();

        if (roleUser && ['ca_team_lead', 'career_associate', 'scraping_team'].includes(roleUser.role)) {
          rolesSet.add(roleUser.role);
        }
      }

      // Step 3: If all 3 roles confirmed, close the ticket and notify AM
      if (rolesSet.size === 3) {
        await supabase.from('tickets').update({
          status: 'closed',
          updatedAt: new Date().toISOString()
        }).eq('id', ticket.id);

        setCurrentStatus('closed');

        // Notify AM with a comment
        await supabase.from('ticket_comments').insert({
          ticket_id: ticket.id,
          user_id: ticket.createdby,
          content: 'Updates Done – All teams have confirmed the resume update.',
          is_internal: false,
          ticketStatusAtTime: 'closed'
        });

        alert("Ticket closed. Account Manager has been notified.");
      } else {
        alert("Acknowledged. Waiting for other teams to confirm.");
      }
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      console.error("Resume acknowledgment failed:", err);
      alert("Something went wrong while confirming.");
    }
  };


  const handleResolveTicket = async () => {
    if (!ticket) return;

    try {
      await supabase.from('tickets').update({
        status: 'resolved',
        updatedAt: new Date().toISOString()
      }).eq('id', ticket.id);

      setCurrentStatus('resolved');
      alert("Ticket resolved successfully!");
      onClose();
      if (onTicketUpdated) onTicketUpdated();
    } catch (error) {
      console.error("Error resolving ticket:", error);
    }
  };

  const handleResumeUpload = async () => {
    if (!ticket || !userFile) {
      alert("Please select a file before submitting.");
      return;
    }

    try {
      setIsSubmittingComment(true); // Optional: disable buttons during upload

      // ✅ Upload file to Supabase Storage
      const filePath = `${ticket.id}/${Date.now()}-${userFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('ticket-attachments') // This must be your storage bucket name
        .upload(filePath, userFile);

      if (uploadError) {
        console.error("File upload failed:", uploadError);
        alert("File upload failed.");
        return;
      }

      // ✅ Add file reference to ticket_files
      await supabase.from('ticket_files').insert({
        ticket_id: ticket.id,
        file_path: filePath,
        uploaded_by: user.id
      });

      // ✅ Optional comment
      if (userComment.trim()) {
        await supabase.from('ticket_comments').insert({
          ticket_id: ticket.id,
          user_id: user.id,
          content: userComment,
          is_internal: false,
          ticketStatusAtTime: ticket.status
        });
      }

      // ✅ Update ticket status to resolved
      await supabase.from('tickets').update({
        status: 'resolved',
        updatedAt: new Date().toISOString()
      }).eq('id', ticket.id);

      alert("Updated resume uploaded successfully.");

      // 🔄 Reset input
      setUserComment('');
      setUserFile(null);
      onClose(); // Close the modal
    } catch (err) {
      console.error("Upload error:", err);
      alert("Something went wrong.");
    } finally {
      setIsSubmittingComment(false);
    }
  };


  const handleForwardTicketResume = async () => {
    if (!ticket || !managerComment.trim()) {
      alert("Please add a comment before forwarding.");
      return;
    }

    try {
      setIsClosing(true);

      // ✅ 1. Add AM's message as a ticket comment
      await supabase.from('ticket_comments').insert({
        ticket_id: ticket.id,
        user_id: user.id,
        content: managerComment,
        is_internal: false,
        ticketStatusAtTime: ticket.status
      });

      // ✅ 2. Fetch CA Manager, CA, Scraper from clients table
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('careerassociateid, careerassociatemanagerid, scraperid')
        .eq('id', ticket.clientId)
        .single();

      if (clientError || !clientData) {
        console.error("Client fetch error:", clientError);
        alert("Could not fetch assigned team members.");
        return;
      }

      const { careerassociateid, careerassociatemanagerid, scraperid } = clientData;

      // ✅ 3. Check current assignments
      const { data: existingAssignments } = await supabase
        .from('ticket_assignments')
        .select('user_id')
        .eq('ticket_id', ticket.id);

      const alreadyAssigned = new Set(existingAssignments?.map((a) => a.user_id));
      const assignmentsToInsert = [];

      if (careerassociateid && !alreadyAssigned.has(careerassociateid)) {
        assignmentsToInsert.push({
          ticket_id: ticket.id,
          user_id: careerassociateid,
          assignedBy: user.id,
        });
      }

      if (careerassociatemanagerid && !alreadyAssigned.has(careerassociatemanagerid)) {
        assignmentsToInsert.push({
          ticket_id: ticket.id,
          user_id: careerassociatemanagerid,
          assignedBy: user.id,
        });
      }

      if (scraperid && !alreadyAssigned.has(scraperid)) {
        assignmentsToInsert.push({
          ticket_id: ticket.id,
          user_id: scraperid,
          assignedBy: user.id,
        });
      }

      if (assignmentsToInsert.length > 0) {
        const { error: insertErr } = await supabase
          .from('ticket_assignments')
          .insert(assignmentsToInsert);

        if (insertErr) {
          console.error("Error inserting assignments:", insertErr);
          alert("Could not assign ticket.");
          return;
        }
      }

      // ✅ 4. Mark status as forwarded
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          status: 'forwarded',
          updatedAt: new Date().toISOString()
        })
        .eq('id', ticket.id);

      if (updateError) {
        console.error("Status update failed:", updateError);
        alert("Could not update ticket status.");
        return;
      }

      setCurrentStatus('forwarded');
      alert("Ticket forwarded to CA Team and Scraping Team successfully!");
      onClose();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      console.error("Forward ticket error:", err);
      alert("Something went wrong.");
    } finally {
      setIsClosing(false);
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
        await supabase.from('ticket_files').insert({
          ticket_id: ticket.id,
          file_path: uploadedFilePath,
          uploaded_by: user.id,
        });

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
    // if (ticket?.type === 'resume_update' && user.role === 'account_manager') {
    //   return false; // Hide buttons for Account Manager
    // }
    // Check if user can edit this ticket based on role and assignment
    if (user.role === 'cro' || user.role === 'coo' || user.role === 'ceo') return true;
    if (alreadyAssignedIds.has(user?.id)) return true;
    // if (user.role === 'ca_manager' && ticket.type === 'volume_shortfall') return true;
    // if (user.role === 'account_manager' && ticket.type === 'volume_shortfall') return true;
    if (user.role === 'resume_team' && ticket.type === 'resume_update') return true;
    if (user.role === 'scraping_team' && ticket.type === 'job_feed_empty') return true;
    return false;
  };

  // Function to get the color of the ticket status
  const getStatusColor = (status: TicketStatus) => {
    const colors: Record<TicketStatus, string> = {
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      escalated: 'bg-red-100 text-red-800',
      closed: 'bg-gray-100 text-gray-800',
      forwarded: 'bg-yellow-100 text-yellow-800',
      replied: 'bg-cyan-100 text-cyan-800', // Added missing status
    };
    return colors[status];
  };
  const timeUntilDue = new Date(ticket.dueDate).getTime() - new Date().getTime();
  const isOverdue = timeUntilDue < 0;
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


  const refetchTicketFromSupabase = async () => {
    if (!ticket?.id) return;

    const { data: updatedTicket, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticket.id)
      .single();

    if (error) {
      console.error("Error refetching updated ticket:", error);
      return;
    }

    // ✅ Update the localTicket and currentStatus
    setLocalTicket(updatedTicket);
    setCurrentStatus(updatedTicket.status);
  };



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
            aria-label="Close"
            title="Close"
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
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(localTicket?.status || 'open')}`}>
                  {(localTicket?.status || 'open').replace('_', ' ').toUpperCase()}
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
                  <p className="text-gray-900">{localTicket?.title}</p>
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
                          {u.name}
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
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-gray-900">{format(new Date(ticket.createdat), 'yyyy-MM-dd hh:mm a')}</p>
                </div>
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

          {/* Add this section after the metadata display */}
          {user.role === 'resume_team' && localTicket?.status === 'open' && localTicket?.type === 'resume_update' && (
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Resume Update</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Updated Resume
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  className="w-full text-sm border border-gray-300 rounded p-2"
                  title="Upload updated resume"
                  placeholder="Choose a resume file"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Update Notes
                </label>
                <textarea
                  value={resumeComment}
                  onChange={(e) => setResumeComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the changes made to the resume..."
                />
              </div>

              <button
                onClick={handleForwardToAccountManager}
                disabled={isForwarding || (!resumeFile && !resumeComment.trim())}
                className={`px-4 py-2 rounded-lg ${isForwarding || (!resumeFile && !resumeComment.trim())
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                {isForwarding ? 'Forwarding...' : 'Forward to Account Manager'}
              </button>

              {!resumeFile && !resumeComment && (
                <p className="mt-2 text-sm text-red-600">
                  Please upload a file or add notes before forwarding
                </p>
              )}
            </div>
          )}

          {latestResumeUpdate && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                Latest Update from Resume Team
              </h3>

              {/* Message */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Notes
                </label>
                <div className="bg-white p-3 rounded border">
                  {latestResumeUpdate.message}
                  {!latestResumeUpdate.fileUrl && (
                    <p className="text-red-500 text-sm mt-1">[File upload failed]</p>
                  )}
                </div>
              </div>

              {/* File */}
              {latestResumeUpdate.fileUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Updated Resume
                  </label>
                  <a
                    href={latestResumeUpdate.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center"
                  >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {latestResumeUpdate.fileName}
                  </a>
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs text-gray-500 mt-2">
                Last updated: {format(new Date(latestResumeUpdate.timestamp), 'yyyy-MM-dd HH:mm')}
              </div>
            </div>
          )}



          {user.role === 'account_manager' && ticket.type === 'resume_update' && currentStatus === 'in_progress' && (
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <h3 className="text-lg font-semibold text-green-900 mb-4">Resume Review</h3>

              {/* Display latest resume file */}
              {ticketFiles.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Updated Resume
                  </label>
                  <a
                    href={supabase.storage.from('ticket-attachments').getPublicUrl(ticketFiles[0].file_path).data.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Download Latest Resume
                  </a>
                </div>
              )}

              {/* Display latest comment */}
              {ticketComments.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Notes from Resume Team
                  </label>
                  <div className="bg-white p-3 rounded border">
                    {ticketComments[ticketComments.length - 1].content}
                  </div>
                </div>
              )}

              {/* Action area */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Comments
                </label>
                <textarea
                  value={managerComment}
                  onChange={(e) => setManagerComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 mb-4"
                  placeholder="Add your comments..."
                  required
                />

                <div className="flex space-x-4">
                  <button
                    onClick={handleForwardTicketResume}
                    disabled={isClosing || !managerComment.trim()}
                    className={`px-4 py-2 rounded-lg ${isClosing || !managerComment.trim()
                      ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                  >
                    {isClosing ? 'Forwarding...' : 'Forward to CA Manager, CA, and Scraping Team'}
                  </button>

                  <button
                    onClick={handleSendBackToResumeTeam}
                    disabled={isSendingBack || !managerComment.trim()}
                    className={`px-4 py-2 rounded-lg ${isSendingBack || !managerComment.trim()
                      ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                  >
                    {isSendingBack ? 'Sending...' : 'Send Back to Resume Team'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===== STEP 3: CA TEAM - FORWARDED STATUS ===== */}
          {['ca_team_lead', 'career_associate', 'scraping_team'].includes(user.role) &&
            currentStatus === 'forwarded' && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-800 mb-3">Ticket Actions</h3>
                {/* Show latest Account Manager comment */}
                {ticketComments
                  .filter(c => c.user_id === ticket.createdby)
                  .slice(-1)
                  .map((c, i) => (
                    <div key={i} className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Message from Account Manager</label>
                      <div className="bg-white p-3 rounded border text-gray-800">{c.content}</div>
                    </div>
                  ))}

                {/* Show latest uploaded resume (if any) */}
                {ticketFiles.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Updated Resume File</label>
                    <a
                      href={ticketFiles[ticketFiles.length - 1].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Download Resume
                    </a>
                  </div>
                )}
                <button
                  onClick={handleResumeAcknowledgement}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Received Updated Resume
                </button>
                <p className="text-sm text-yellow-700 mt-2">
                  Mark as closed after reviewing the resume updates
                </p>
              </div>
            )}

          {/* ===== STEP 4: ACCOUNT MANAGER - CLOSED STATUS ===== */}
          {user.role === 'account_manager' && currentStatus === 'closed' && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-3">Final Resolution</h3>
              <button
                onClick={handleResolveTicket}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Mark as Resolved
              </button>
              <p className="text-sm text-green-700 mt-2">
                Confirm all parties have reviewed and approved the changes
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
                    {/* <div className="text-gray-700">{comment.content} Commented by {comment.user_id}</div> */}
                    <div className="text-gray-700">{comment.content} Commented by {userNameMap[comment.user_id] || 'Unknown'} ({comment.users?.role?.replace('_', ' ') || 'Unknown Role'})</div>
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
                      href={`https://oqqbgqkxrhachfgkwiya.supabase.co/storage/v1/object/public/ticket-attachments/${file.file_path}`}
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

                {/* CA/Scraping Team View - Read Only */}
                {(user.role === 'career_associate' || user.role === 'scraping_team') &&
                  ticket.type === 'resume_update' && ticket.status === 'closed' && (
                    <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">

                      {/* Final Resume File */}
                      {downloadUrl && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Final Resume Version
                          </label>
                          <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center"
                          >
                            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download Resume
                          </a>
                        </div>
                      )}
                        <h3 className="text-lg font-semibold text-purple-900 mb-4">Final Review Done</h3>
                    </div>
                  )}

                {/* Role-Specific Actions */}
                {user.role === 'scraping_team' && ticket.type === 'job_feed_empty' && (
                  <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                    <h3 className="text-lg font-semibold text-purple-900 mb-4">Scraping Team Actions</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded border-gray-300 text-purple-600" />
                        <span className="text-sm">Verified job feed sources</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded border-gray-300 text-purple-600" />
                        <span className="text-sm">Updated scraping algorithms</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded border-gray-300 text-purple-600" />
                        <span className="text-sm">Added new job sources</span>
                      </label>
                    </div>
                  </div>
                )}

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

export default TicketEditModal;