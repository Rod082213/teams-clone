// pages/index.js
import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import Modal from '../components/Modal';

const EmojiPicker = dynamic(
  () => import('emoji-picker-react'),
  {
    ssr: false,
    loading: () => <p style={{padding: '10px', textAlign: 'center'}}>Loading Emojis...</p>
  }
);

const UserAvatar = ({ username, size = 40, style, imageUrl }) => {
  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt={username ? `${username}'s avatar` : 'User avatar'}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          marginRight: '10px',
          objectFit: 'cover',
          flexShrink: 0,
          border: '1px solid var(--border-color)',
          ...style
        }} 
      />
    );
  }
  const initial = username ? String(username).charAt(0).toUpperCase() : '?';
  const defaultStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    backgroundColor: 'var(--accent-color)',
    color: 'var(--accent-text-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `${size * 0.5}px`,
    fontWeight: 'bold',
    marginRight: '10px',
    flexShrink: 0,
  };
  return (
    <div style={{ ...defaultStyle, ...style }}>
      {initial}
    </div>
  );
};

let socket;

export default function Home({ theme, toggleTheme }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);

  const [openDropdownChatId, setOpenDropdownChatId] = useState(null);
  const dropdownRef = useRef(null);

  const [modalState, setModalState] = useState({
    isOpen: false, title: '', content: null, onConfirm: null, onCancel: null,
    confirmText: 'Confirm', cancelText: 'Cancel', type: 'alert', size: 'md'
  });

  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatUsername, setNewChatUsername] = useState('');
  const [expandedMessageId, setExpandedMessageId] = useState(null);

  const imageUploadInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageToSend, setImageToSend] = useState(null);
  const [imageCaption, setImageCaption] = useState('');
  const [isImagePreviewModalOpen, setIsImagePreviewModalOpen] = useState(false);

  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState(null);
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);
  const editAvatarInputRef = useRef(null);

  const [isMobileView, setIsMobileView] = useState(false);
  const [showChatWindowOnMobile, setShowChatWindowOnMobile] = useState(false);

  // Refs for Header Dropdown
  const [isHeaderDropdownOpen, setIsHeaderDropdownOpen] = useState(false);
  const headerDropdownRef = useRef(null);     // For the dropdown menu itself
  const headerDotsButtonRef = useRef(null); // For the 3-dots button that opens it

  const openModal = ({ title, content, onConfirm, onCancel, confirmText, cancelText, type = 'alert', size = 'md' }) => {
    setModalState({ isOpen: true, title, content, onConfirm, onCancel, confirmText, cancelText, type, size });
  };
  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false, onConfirm: null, onCancel: null }));
  };

  const onEmojiClick = (event, emojiObject) => { 
    const emoji = emojiObject?.emoji || event?.emoji;
    if (emoji) {
      setNewMessage(prevInput => prevInput + emoji);
    }
  };
  const openImageViewModal = (imageUrl) => {
    openModal({
      content: ( <div style={{ textAlign: 'center', padding: '10px 0' }}> <img src={imageUrl} alt="Full view" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px', objectFit: 'contain' }} /> </div> ),
      type: 'alert', size: 'lg',
    });
  };

  useEffect(() => {
    const checkMobileView = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      if (!mobile && showChatWindowOnMobile) { 
        setShowChatWindowOnMobile(false);
      }
    };
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, [showChatWindowOnMobile]);

  useEffect(() => {
    if (isMobileView && activeChat) {
      setShowChatWindowOnMobile(true);
      setExpandedMessageId(null);
    }
  }, [activeChat, isMobileView]);

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
  };

  const handleBackToChatListMobile = () => {
    setActiveChat(null); 
    setShowChatWindowOnMobile(false); 
    setExpandedMessageId(null);
  };

  useEffect(() => {
    function handleClickOutsideDropdown(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && !event.target.closest('.chat-actions-button')) {
        setOpenDropdownChatId(null);
      }
    }
    if (openDropdownChatId) document.addEventListener("mousedown", handleClickOutsideDropdown);
    return () => document.removeEventListener("mousedown", handleClickOutsideDropdown);
  }, [openDropdownChatId]);
  
  useEffect(() => {
    function handleClickOutsideHeaderDropdown(event) {
      if (headerDropdownRef.current && !headerDropdownRef.current.contains(event.target) && headerDotsButtonRef.current && !headerDotsButtonRef.current.contains(event.target)) {
        setIsHeaderDropdownOpen(false);
      }
    }
    if (isHeaderDropdownOpen) document.addEventListener("mousedown", handleClickOutsideHeaderDropdown);
    return () => document.removeEventListener("mousedown", handleClickOutsideHeaderDropdown);
  }, [isHeaderDropdownOpen]);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user && user.id && user.username) setCurrentUser(user);
        else localStorage.removeItem('currentUser');
      } catch (e) { localStorage.removeItem('currentUser'); }
    }
  }, []);

  useEffect(() => {
    function handleClickOutsideEmojiPicker(event) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) && emojiButtonRef.current && !emojiButtonRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    }
    if(showEmojiPicker) document.addEventListener("mousedown", handleClickOutsideEmojiPicker);
    return () => document.removeEventListener("mousedown", handleClickOutsideEmojiPicker);
  }, [showEmojiPicker, emojiPickerRef, emojiButtonRef]);

  useEffect(() => {
    let cleanupSocketFunction;
    if (currentUser && currentUser.id) {
        fetchChats(currentUser.id);
        cleanupSocketFunction = initializeSocket(currentUser.id);
    } else if (socket) {
        socket.disconnect(); socket = null;
    }
    return () => {
        if (cleanupSocketFunction) cleanupSocketFunction();
        else if (socket && !currentUser) { socket.disconnect(); socket = null; }
    };
  }, [currentUser?.id]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput.trim()) { setAuthError('Username and password are required.'); return; }
    setAuthLoading(true); setAuthError('');
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: usernameInput.trim(), password: passwordInput }), });
      const data = await res.json();
      if (res.ok) {
        if (authMode === 'register') { openModal({title: "Registration Success", content: "Registration successful! Please log in."}); setAuthMode('login'); setPasswordInput(''); }
        else { setCurrentUser(data.user); localStorage.setItem('currentUser', JSON.stringify(data.user)); }
      } else { setAuthError(data.error || `An error occurred during ${authMode}.`); }
    } catch (error) { setAuthError(`An error occurred. Please try again.`); }
    finally { setAuthLoading(false); }
  };

  const handleLogout = () => {
    setIsHeaderDropdownOpen(false); 
    setCurrentUser(null); localStorage.removeItem('currentUser');
    setActiveChat(null); setMessages([]); setChats([]);
    setUsernameInput(''); setPasswordInput(''); setAuthMode('login');
    setShowChatWindowOnMobile(false);
  };

  const fetchChats = async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/chats?userId=${userId}`);
      const data = await res.json();
      if (res.ok) setChats(data.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)));
      else setChats([]);
    } catch (error) { setChats([]); }
  };

  const fetchMessages = async (chatId) => {
    if (!chatId || !currentUser || !currentUser.id) { setMessages([]); return; }
    try {
      const res = await fetch(`/api/messages/${chatId}?userId=${currentUser.id}`);
      const data = await res.json();
      if (res.ok) { setMessages(data); setExpandedMessageId(null); }
      else setMessages([]);
    } catch (error) { setMessages([]); }
  };
  
  const openNewChatModal = () => {
    if (!currentUser || !currentUser.id) { openModal({ title: "Login Required", content: "Please log in to create a new chat." }); return; }
    setNewChatUsername(''); setIsNewChatModalOpen(true);
  };

  const handleNewChatModalConfirm = async () => {
    const usernameToChatWith = newChatUsername.trim();
    setIsNewChatModalOpen(false);
    if (!usernameToChatWith) { openModal({ title: "Input Required", content: "Username is required." }); return; }
    if (usernameToChatWith === currentUser.username) { openModal({ title: "Self Chat", content: "Cannot chat with yourself." }); return; }
    try {
      const userRes = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: usernameToChatWith }) });
      const otherUser = await userRes.json();
      if (!userRes.ok || !otherUser || !otherUser.id) { openModal({ title: "User Not Found", content: `User "${usernameToChatWith}" was not found.` }); return; }
      const chatRes = await fetch('/api/chats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isGroup: false, participantIds: [currentUser.id, otherUser.id] }) });
      const newChatData = await chatRes.json();
      if (chatRes.ok) {
        setChats(prev => [newChatData, ...prev.filter(c => c.id !== newChatData.id)].sort((a,b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)));
        setActiveChat(newChatData); socket?.emit('join_chat', newChatData.id);
      } else { openModal({ title: "Chat Creation Failed", content: `Failed: ${newChatData.error || 'Unknown error'}` }); }
    } catch (error) { openModal({ title: "Error", content: 'Error creating chat.' }); }
  };
  
  const handleDeleteChat = async (chatIdToDelete) => {
    if (!currentUser || !chatIdToDelete) return;
    openModal({
      title: 'Delete Chat?', content: <p>Are you sure you want to delete this chat?</p>, type: 'confirm', confirmText: 'Delete',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/chats/${chatIdToDelete}`, { method: 'DELETE' });
          if (res.ok) {
            setChats(prev => prev.filter(chat => chat.id !== chatIdToDelete));
            if (activeChat?.id === chatIdToDelete) { setActiveChat(null); setMessages([]); }
            openModal({ title: 'Success', content: 'Chat deleted.' });
          } else { const data = await res.json().catch(() => ({error: "Failed to parse error"})); openModal({ title: 'Error', content: `Failed: ${data.error || 'Server error'}` }); }
        } catch (error) { openModal({ title: 'Error', content: 'Error deleting chat.' }); }
      },
    });
    setOpenDropdownChatId(null);
  };

  const handleBlockUser = async (chatContext) => {
    if (!currentUser || !chatContext || chatContext.isGroup) { setOpenDropdownChatId(null); return; }
    const otherParticipant = chatContext.participants.find(p => p.userId !== currentUser.id);
    if (!otherParticipant?.user) { openModal({ title: "Error", content: 'Other user not found.'}); setOpenDropdownChatId(null); return; }
    const { userId: otherUserId, username: otherUsername } = otherParticipant.user;
    openModal({
      title: `Block ${otherUsername}?`, content: <p>Confirm blocking this user?</p>, type: 'confirm', confirmText: 'Block',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/users/block', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blockerUserId: currentUser.id, blockedUserId: otherUserId }) });
          if (res.ok) {
            openModal({title: "User Blocked", content: `${otherUsername} blocked.`});
            fetchChats(currentUser.id); if (activeChat?.id === chatContext.id) setActiveChat(null);
          } else { const data = await res.json().catch(() => ({error: "Failed to parse error"})); openModal({title: "Error", content: `Failed: ${data.error || 'Server error'}`});}
        } catch (error) { openModal({title: "Error", content: 'Error blocking user.'}); }
      },
    });
    setOpenDropdownChatId(null);
  };

  const initializeSocket = (userId) => {
    if (!userId) return () => {};
    if (socket && socket.connected && socket.authUserId === userId) return () => {};
    if (socket) socket.disconnect();
    socket = io(undefined, { path: '/socket.io' });
    socket.authUserId = userId;
    socket.on('connect', () => { socket.emit('authenticate', userId); if (activeChat?.id) socket.emit('join_chat', activeChat.id); });
    socket.on('receive_message', (newMessageObject) => {
      if (!newMessageObject?.chatId || !newMessageObject.id || !newMessageObject.sender) return;
      setChats(prev => prev.map(c => c.id === newMessageObject.chatId ? { ...c, messages: [newMessageObject], lastMessageAt: newMessageObject.createdAt } : c).sort((a,b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)));
      setActiveChat(currActive => {
        if (currActive?.id === newMessageObject.chatId) {
          setMessages(prevMsgs => {
            const optIdx = prevMsgs.findIndex(m => m.isOptimistic && m.tempId === newMessageObject.tempId && m.senderId === currentUser?.id);
            if (optIdx > -1 && newMessageObject.senderId === currentUser?.id) { const u = [...prevMsgs]; u[optIdx] = {...newMessageObject, isOptimistic: false}; return u; }
            else if (!prevMsgs.find(m => m.id === newMessageObject.id)) return [...prevMsgs, {...newMessageObject, isOptimistic: false}];
            return prevMsgs;
          });
          if (currentUser?.id !== newMessageObject.senderId) socket.emit('message_read', { messageId: newMessageObject.id, userId: currentUser.id, chatId: newMessageObject.chatId });
        }
        return currActive;
      });
    });
    socket.on('read_receipt_update', ({ messageId, userId: rId, readAt, username: rName }) => {
      setMessages(prevMsgs => prevMsgs.map(m => m.id === messageId ? (m.readReceipts?.find(rr => rr.userId === rId) ? m : {...m, readReceipts: [...(m.readReceipts || []), {userId: rId, readAt, user:{username: rName||'User'}}]}) : m));
    });
    socket.on('disconnect', r => console.log(`CLIENT: Socket disconnected: ${r}`));
    socket.on('connect_error', e => console.error(`CLIENT: Socket connect_error: ${e.message}`, e));
    socket.on('message_error', e => openModal({title: "Chat Error", content: e.message}));
    return () => { if (socket) { socket.removeAllListeners(); socket.disconnect(); socket = null; }};
  };
  
  const getReadByNames = (message) => {
    if (!message?.readReceipts?.length) return null;
    const readers = message.readReceipts.filter(rr => rr.userId !== message.senderId).map(rr => rr.user?.username || "User").filter(uname => currentUser && uname !== currentUser.username);
    return readers.length ? `Seen by ${readers.join(', ')}` : null;
  };

  const handleMessageTap = (messageId) => setExpandedMessageId(prevId => (prevId === messageId ? null : messageId));

  useEffect(() => {}, [currentUser]); 

  useEffect(() => {
    if (activeChat?.id && currentUser?.id) { fetchMessages(activeChat.id); if (socket?.connected) socket.emit('join_chat', activeChat.id); }
    else setMessages([]);
  }, [activeChat?.id, currentUser?.id, socket?.connected]);

  useEffect(() => { if(messages?.length) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!activeChat?.id || !currentUser?.id || !socket || !messages?.length) return () => {};
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const { messageId, senderId, optimistic } = entry.target.dataset;
          if (optimistic === "true") { observer.unobserve(entry.target); return; }
          const msg = messages.find(m => m.id === messageId);
          if (msg && senderId !== currentUser.id && !msg.readReceipts?.some(rr => rr.userId === currentUser.id)) {
            socket.emit('message_read', { messageId, userId: currentUser.id, chatId: activeChat.id });
          }
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.8 });
    document.querySelectorAll('.message-item[data-message-id]:not([data-optimistic="true"])').forEach(el => {
      const msg = messages.find(m => m.id === el.dataset.messageId);
      if (msg && msg.senderId !== currentUser.id && !msg.readReceipts?.some(rr => rr.userId === currentUser.id)) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [messages, activeChat?.id, currentUser?.id, socket]);

  const handleSendMessage = (contentOverride) => {
    const textToSend = (typeof contentOverride === 'string' ? contentOverride : newMessage).trim();
    if (!textToSend && !imageToSend) { return; }
    if (!activeChat?.id || !currentUser?.id || !socket) return;
    setShowEmojiPicker(false); 
    if (textToSend) {
        const tempId = `temp_text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const optimisticMessage = { 
            id: tempId, tempId, content: textToSend, createdAt: new Date().toISOString(), 
            senderId: currentUser.id, chatId: activeChat.id, 
            sender: { id: currentUser.id, username: currentUser.username, avatarUrl: currentUser.avatarUrl }, 
            readReceipts: [], isOptimistic: true, messageType: 'text', imageUrl: null 
        };
        setMessages(prev => [...prev, optimisticMessage]);
        setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, messages: [optimisticMessage], lastMessageAt: optimisticMessage.createdAt } : c).sort((a,b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)));
        socket.emit('send_message', { chatId: activeChat.id, senderId: currentUser.id, content: textToSend, tempId, messageType: 'text' });
    }
    setNewMessage('');
  };

  const handleImageInputClick = () => {
    if (uploadingImage) return;
    imageUploadInputRef.current?.click();
  };

  const handleImageFileSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { openModal({ title: "Invalid File", content: "Please select an image file."}); if(imageUploadInputRef.current) imageUploadInputRef.current.value = ""; return; }
    if (file.size > 5 * 1024 * 1024) { openModal({ title: "File Too Large", content: "Image size should not exceed 5MB."}); if(imageUploadInputRef.current) imageUploadInputRef.current.value = ""; return; }
    setImageToSend(file); setImageCaption(''); setIsImagePreviewModalOpen(true); 
    if (imageUploadInputRef.current) imageUploadInputRef.current.value = "";
  };

  const confirmAndSendImageWithCaption = async () => {
    if (!imageToSend || !activeChat || !currentUser || !socket) { setIsImagePreviewModalOpen(false); setImageToSend(null); setImageCaption(''); return; }
    setIsImagePreviewModalOpen(false); setUploadingImage(true);
    const tempId = `temp_img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let localOptimisticUrl = null;
    try { localOptimisticUrl = URL.createObjectURL(imageToSend); } catch (e) { console.error("Error creating blob URL", e); }
    const optimisticImageMsg = { id: tempId, tempId, content: imageCaption, imageUrl: localOptimisticUrl, messageType: 'image', createdAt: new Date().toISOString(), senderId: currentUser.id, chatId: activeChat.id, sender: { id: currentUser.id, username: currentUser.username, avatarUrl: currentUser.avatarUrl }, readReceipts: [], isOptimistic: true, };
    setMessages(prev => [...prev, optimisticImageMsg]);
    setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, messages: [optimisticImageMsg], lastMessageAt: optimisticImageMsg.createdAt } : c).sort((a,b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)));
    const formData = new FormData();
    formData.append('image', imageToSend);
    try {
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        socket.emit('send_message', { chatId: activeChat.id, senderId: currentUser.id, content: imageCaption, imageUrl: data.imageUrl, messageType: 'image', tempId: tempId });
      }  else { openModal({ title: 'Image Upload Failed', content: data.error || 'Could not upload image.' }); setMessages(prev => prev.filter(msg => msg.id !== tempId)); }
    } catch (error) { openModal({ title: 'Error', content: 'An error occurred during image upload.' }); setMessages(prev => prev.filter(msg => msg.id !== tempId)); }
    finally { setUploadingImage(false); setImageToSend(null); setImageCaption(''); if (localOptimisticUrl) URL.revokeObjectURL(localOptimisticUrl); if(imageUploadInputRef.current) imageUploadInputRef.current.value = ""; }
  };
  
  const openEditProfileModal = () => {
    if (!currentUser) return;
    setEditUsername(currentUser.username);
    setEditAvatarFile(null);
    setEditAvatarPreview(currentUser.avatarUrl || null);
    setIsEditProfileModalOpen(true);
    setIsHeaderDropdownOpen(false); // Close header dropdown when opening edit profile
  };
  const handleEditAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) { openModal({ title: "Invalid File", content: "Please select an image file." }); return; }
      if (file.size > 2 * 1024 * 1024) { openModal({ title: "File Too Large", content: "Avatar size should not exceed 2MB." }); return; }
      setEditAvatarFile(file);
      setEditAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleProfileUpdate = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!currentUser) return;
    const newUsernameTrimmed = editUsername.trim();
    const isUsernameChanged = newUsernameTrimmed && newUsernameTrimmed.length >= 3 && newUsernameTrimmed !== currentUser.username;
    const isAvatarChanged = !!editAvatarFile;
    if (!isUsernameChanged && !isAvatarChanged) { openModal({ title: "No Changes", content: "No changes to update." }); return; }
    if (isUsernameChanged && newUsernameTrimmed.length < 3) { openModal({ title: "Validation Error", content: "Username must be at least 3 characters." }); return; }
    setProfileUpdateLoading(true);
    const formData = new FormData();
    formData.append('userId', currentUser.id);
    if (isUsernameChanged) formData.append('username', newUsernameTrimmed);
    if (isAvatarChanged) formData.append('avatar', editAvatarFile);
    try {
      const res = await fetch('/api/users/profile', { method: 'PUT', body: formData });
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user); localStorage.setItem('currentUser', JSON.stringify(data.user));
        openModal({ title: "Success", content: "Profile updated successfully!" });
        setIsEditProfileModalOpen(false); setEditAvatarFile(null); setEditAvatarPreview(data.user.avatarUrl || null);
      } else { openModal({ title: "Update Failed", content: data.error || "Could not update profile." }); }
    } catch (error) { openModal({ title: "Error", content: "Error updating profile." }); }
    finally { setProfileUpdateLoading(false); }
  };
  
  const getChatDisplayName = (chat) => {
    if (!chat) return "Chat";
    if (chat.isGroup) return chat.name || "Group Chat";
    if (!chat.participants || !currentUser) return "User";
    const other = chat.participants.find(p => p.userId !== currentUser.id);
    return other?.user?.username || "User";
  };

  if (!currentUser) {
    return (
      <>
        <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.title} {...modalState}>{modalState.content}</Modal>
        <div className="login-form-wrapper">
          <div className="login-form">
            <Head><title>{authMode === 'login' ? 'Login' : 'Register'} - Chat App</title></Head>
            <h1>{authMode === 'login' ? 'Login' : 'Register'}</h1>
            {authError && <p className="auth-error-message">{authError}</p>}
            <form onSubmit={handleAuthSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="usernameL">Username</label>
                <input id="usernameL" type="text" className="auth-input" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} placeholder="Enter username" required />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="passwordL">Password</label>
                <input id="passwordL" type="password" className="auth-input" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Enter password" required />
              </div>
              <button type="submit" className="auth-primary-button" disabled={authLoading}>
                {authLoading ? 'Processing...' : (authMode === 'login' ? 'Login' : 'Register')}
              </button>
            </form>
            <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); setUsernameInput(''); setPasswordInput('');}} disabled={authLoading} className="auth-secondary-button">
              {authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head><title>Chat App - {currentUser.username}</title></Head>
      <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.title} {...modalState}>{modalState.content}</Modal>
      <Modal isOpen={isNewChatModalOpen} onClose={() => setIsNewChatModalOpen(false)} title="Start a New Chat" onConfirm={handleNewChatModalConfirm} confirmText="Start Chat" type="confirm" size="sm">
        <div style={{paddingTop: '10px'}}>
          <label htmlFor="newChatUsernameInput" style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.9em', textAlign: 'left' }}>Enter username:</label>
          <input type="text" id="newChatUsernameInput" value={newChatUsername} onChange={(e) => setNewChatUsername(e.target.value)} placeholder="Username" className="auth-input" autoFocus onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleNewChatModalConfirm(); }}} style={{ marginBottom: '20px' }}/>
        </div>
      </Modal>
      <Modal isOpen={isImagePreviewModalOpen} onClose={() => { setIsImagePreviewModalOpen(false); if (imageToSend && typeof imageToSend === 'object' && imageToSend instanceof Blob ) URL.revokeObjectURL(URL.createObjectURL(imageToSend)); setImageToSend(null); setImageCaption(''); }} title="Send Image" onConfirm={confirmAndSendImageWithCaption} confirmText="Send" type="confirm" size="md">
        {imageToSend && ( <div style={{ textAlign: 'center' }}> <img src={typeof imageToSend === 'string' ? imageToSend : URL.createObjectURL(imageToSend)} alt="Preview" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', marginBottom: '15px', border: '1px solid var(--border-color)'}} /> <textarea value={imageCaption} onChange={(e) => setImageCaption(e.target.value)} placeholder="Add a caption... (optional)" rows="2" className="auth-input" style={{ width: '100%', marginBottom: '0px' }} /> </div> )}
      </Modal>
      <Modal isOpen={isEditProfileModalOpen} onClose={() => { setIsEditProfileModalOpen(false); setEditAvatarFile(null); setEditAvatarPreview(null); }} title="Edit Your Profile" onConfirm={handleProfileUpdate} confirmText={profileUpdateLoading ? "Saving..." : "Save Changes"} type="confirm" size="md">
        <form onSubmit={handleProfileUpdate}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <label htmlFor="avatarUpload" style={{cursor: 'pointer', display: 'inline-block'}}>
                <UserAvatar username={editUsername} size={100} style={{ margin: '0 auto 10px auto' }} imageUrl={editAvatarPreview || currentUser.avatarUrl} />
                Change Avatar
              </label>
              <input type="file" accept="image/*" id="avatarUpload" ref={editAvatarInputRef} style={{ display: 'none' }} onChange={handleEditAvatarChange} />
            </div>
            <div style={{ marginBottom: '15px' }} className='profile-editor'>
              <label htmlFor="editProfileUsername" style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: '500' }}>Username</label>
              <input type="text" id="editProfileUsername" className="auth-input" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Your new username" required />
            </div>
            <button type="submit" style={{display: 'none'}} aria-hidden="true" />
        </form>
      </Modal>

      <div className="container">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',  paddingBottom: '15px', borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            {isMobileView && showChatWindowOnMobile && activeChat && (
              <button onClick={handleBackToChatListMobile} className="back-button-mobile" title="Back to chats">
                ← 
              </button>
            )}
            {!(isMobileView && showChatWindowOnMobile && activeChat) && (
                 <UserAvatar username={currentUser.username} imageUrl={currentUser.avatarUrl} />
            )}
            <h1 style={{fontSize: '1.3em', margin: 0, marginLeft: (isMobileView && showChatWindowOnMobile && activeChat) ? '10px' : '0px' }}>
              { (isMobileView && showChatWindowOnMobile && activeChat) 
                ? getChatDisplayName(activeChat) 
                : `Welcome, ${currentUser.username}!`
              }
            </h1>
          </div>

          <div style={{ position: 'relative' }}>
            <button
              ref={headerDotsButtonRef}
              className="header-actions-button"
              onClick={(e) => { e.stopPropagation(); setIsHeaderDropdownOpen(prev => !prev); }}
              title="User Actions"
            >
              ⋮
            </button>
            {isHeaderDropdownOpen && (
              <div
                ref={headerDropdownRef}
                className="header-dropdown-menu"
                style={{
                  position: 'absolute', top: 'calc(100% + 5px)', right: '0',
                  backgroundColor: 'var(--dropdown-bg)', border: '1px solid var(--border-color)',
                  borderRadius: '8px', boxShadow: '0 4px 12px var(--shadow-color)',
                  zIndex: 1010, minWidth: '180px', padding: '5px 0',
                }}
              >
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  <li onClick={() => { openEditProfileModal(); }} className="dropdown-item">
                    ⚙️ Edit Profile
                  </li>
                  {typeof toggleTheme === 'function' && (
                    <li onClick={() => { toggleTheme(); setIsHeaderDropdownOpen(false); }} className="dropdown-item">
                      {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                    </li>
                  )}
                  <li onClick={() => { handleLogout(); }} className="dropdown-item" style={{color: '#e74c3c'}}>
                    🚪 Logout
                  </li>
                </ul>
              </div>
            )}
          </div>
        </header>

        <div className="chat-layout">
          <aside 
            className={`sidebar ${isMobileView && showChatWindowOnMobile ? 'mobile-hidden' : ''}`}
            style={{ display: (!isMobileView || (isMobileView && !showChatWindowOnMobile)) ? 'flex' : 'none' }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                <h2 style={{margin: 0, fontSize: '1.2em'}}>Chats</h2>
                <button onClick={openNewChatModal} title="Create New Chat" className='button-custom'>+</button>
            </div>
            {(chats || []).map((chat) => (
              <div key={chat.id} className={`chat-list-item ${activeChat?.id === chat.id ? 'active' : ''}`} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative'}}>
                <div onClick={() => handleSelectChat(chat)} style={{ flexGrow: 1, display: 'flex', alignItems: 'center', marginRight: '30px', cursor: 'pointer'}}>
                  <UserAvatar username={chat.isGroup ? chat.name : chat.participants?.find(p=>p.userId !== currentUser.id)?.user?.username} imageUrl={chat.isGroup ? null : chat.participants?.find(p=>p.userId !== currentUser.id)?.user?.avatarUrl} size={30} style={{marginRight: '8px'}}/>
                  <div>
                    <div className="chat-name">{getChatDisplayName(chat)}</div>
                    {chat.messages?.[0]?.sender && ( <div className="last-message"> <strong>{chat.messages[0].sender.username === currentUser.username ? "You" : chat.messages[0].sender.username}:</strong> {chat.messages[0].messageType === 'image' ? 'Photo' : (chat.messages[0].content ? chat.messages[0].content.substring(0, 20) : '')}... </div> )}
                  </div>
                </div>
                <button className="chat-actions-button" onClick={(e) => { e.stopPropagation(); setOpenDropdownChatId(openDropdownChatId === chat.id ? null : chat.id); }} title="More options">⋮</button>
                {openDropdownChatId === chat.id && ( <div ref={openDropdownChatId === chat.id ? dropdownRef : null} style={{ position: 'absolute', top: 'calc(100% - 10px)', right: '5px', backgroundColor: 'var(--dropdown-bg)', border: '1px solid var(--border-color)', borderRadius: '4px', boxShadow: '0 2px 10px var(--shadow-color)', zIndex: 1001, minWidth: '130px' }}> <ul style={{ listStyle: 'none', margin: 0, padding: '5px 0' }}> <li onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id); }} className="dropdown-item">Delete Chat</li> {!chat.isGroup && (<li onClick={(e) => { e.stopPropagation(); handleBlockUser(chat); }} className="dropdown-item">Block User</li>)} </ul> </div> )}
              </div>
            ))}
          </aside>

          {((!isMobileView && activeChat) || (isMobileView && showChatWindowOnMobile && activeChat)) ? (
             <main 
                className={`chat-window ${isMobileView && showChatWindowOnMobile ? 'mobile-active' : ''}`}
                style={{ display: 'flex' }}
             >
                <>
                    <div className="chat-header">
                        {(isMobileView && showChatWindowOnMobile && activeChat) || !isMobileView ? (
                             <UserAvatar 
                                username={activeChat.isGroup ? activeChat.name : activeChat.participants?.find(p=>p.userId !== currentUser.id)?.user?.username} 
                                imageUrl={activeChat.isGroup ? null : activeChat.participants?.find(p=>p.userId !== currentUser.id)?.user?.avatarUrl} 
                                size={isMobileView ? 30 : 35} 
                                style={{marginRight: isMobileView && showChatWindowOnMobile && activeChat ? '0px' : '12px' }}
                            />
                        ) : null}
                        {!isMobileView && <span style={{fontWeight: 'bold', fontSize: '1.1em'}}>{getChatDisplayName(activeChat)}</span>}
                    </div>
                    <div className="messages-list">
                        {(messages || []).map((msg) => {
                            const isExpanded = expandedMessageId === msg.id;
                            return (
                            <div key={msg.id} className={`message-item ${msg.senderId === currentUser.id ? 'sent' : 'received'} ${msg.isOptimistic ? 'optimistic' : ''}`} data-message-id={msg.id} data-sender-id={msg.senderId} data-optimistic={msg.isOptimistic ? "true" : undefined} onClick={() => handleMessageTap(msg.id)} style={{ cursor: 'pointer' }}>
                            {msg.senderId !== currentUser.id && msg.sender && ( <div style={{display: 'flex', alignItems: 'center', marginBottom: '2px'}}> <UserAvatar username={msg.sender.username} imageUrl={msg.sender.avatarUrl} size={25} style={{marginRight: '6px'}}/> <div className="message-sender">{msg.sender.username}</div> </div> )}
                            {msg.messageType === 'image' && msg.imageUrl ? ( <img src={msg.isOptimistic && msg.imageUrl.startsWith('blob:') ? msg.imageUrl : msg.imageUrl} alt={msg.content || "Uploaded image"} style={{ maxWidth: '250px', maxHeight: '250px', borderRadius: '12px', marginTop: '5px', display:'block', cursor: 'pointer', border: '1px solid var(--border-color)'}} onClick={(e) => {e.stopPropagation(); if (!msg.isOptimistic && msg.imageUrl && !msg.imageUrl.startsWith('blob:')) {openImageViewModal(msg.imageUrl);}}}  onError={(e) => { e.target.style.display = 'none'; const parent = e.target.parentElement; if(parent) parent.insertAdjacentHTML('beforeend', '<p style="color:var(--text-tertiary); font-size:0.8em;">Image load failed</p>')}} /> ) : ( <div className="message-content" style={{ padding: msg.senderId === currentUser.id ? '8px 12px' : (msg.sender ? '0px 0px 8px 31px' : '8px 12px'), wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />') }}></div> )}
                            {isExpanded && !msg.isOptimistic && ( <> <div className="message-timestamp" style={{ textAlign: msg.senderId === currentUser.id ? 'right' : 'left', marginLeft: msg.senderId !== currentUser.id && msg.sender ? '31px' : '0', color: msg.senderId === currentUser.id ? 'var(--timestamp-sent-text)' : 'var(--timestamp-received-text)' }}> {new Date(msg.createdAt).toLocaleTimeString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} </div> {msg.senderId === currentUser.id && getReadByNames(msg) && ( <div className={`read-receipts sent`}>{getReadByNames(msg)}</div> )} </> )}
                            {msg.isOptimistic && ( <div className="message-timestamp" style={{ textAlign: 'right', fontSize: '0.7em', color: 'var(--timestamp-sent-text)', marginTop: '4px' }}> <span style={{marginLeft: '5px', fontSize: '0.9em', opacity: 0.7}}>(Sending...)</span></div> )}
                            </div> );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="message-input-area">
                        <input type="file" accept="image/*" ref={imageUploadInputRef} style={{ display: 'none' }} onChange={handleImageFileSelected} disabled={uploadingImage} />
                        <button onClick={handleImageInputClick} disabled={uploadingImage} title="Attach Image" type="button" className="emoji-toggle-button" style={{marginRight: '5px'}}> {uploadingImage ? '⏳' : '📎'} </button>
                        <button ref={emojiButtonRef} onClick={() => setShowEmojiPicker(prev => !prev)} title="Pick emoji" type="button" className="emoji-toggle-button">😊</button>
                        {showEmojiPicker && ( <div ref={emojiPickerRef} style={{ position: 'absolute', bottom: 'calc(100% + 5px)', left: isMobileView ? '5px' : '50px', zIndex: 1000 }}> <EmojiPicker onEmojiClick={onEmojiClick} lazyLoadEmojis={true} height={isMobileView ? 320 : 400} perLine={isMobileView ? 7 : 9} /> </div> )}
                        <textarea ref={messageInputRef} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." rows="1" style={{marginLeft: '10px', flexGrow: 1, padding: '10px 15px', borderRadius: '20px', border: '1px solid var(--border-strong-color)', fontSize:'1em', maxHeight: '120px', minHeight: '40px', resize: 'none', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)'}} onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = (e.target.scrollHeight) + 'px'; }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}} />
                        <button onClick={() => handleSendMessage()} type="button" className="send-button">Send</button>
                    </div>
                </>
             </main>
          ) : (
             !isMobileView && (
                <main className="chat-window" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '1.1em', flexGrow: 1}}>
                   Select a chat to start messaging or create a new one.
                </main>
             )
           )}
        </div>
      </div>
    </>
  );
}