// // components/auth/RoleSelection.tsx
// import React, { useState, useEffect } from 'react';
// import { AuthService } from '../../services/authService';

// interface RoleSelectionProps {
//   userId: number;
//   onSuccess: (data: any) => void;
// }

// interface Role {
//   id: number;
//   name: string;
//   displayName: string;
//   description: string;
//   icon: string;
// }

// export default function RoleSelection({ userId, onSuccess }: RoleSelectionProps) {
//   const [selectedRole, setSelectedRole] = useState<string>('');
//   const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [availableRoles, setAvailableRoles] = useState<Role[]>([]);

//   // Default roles mapping (fallback nếu không lấy được từ API)
//   const defaultRoles: Role[] = [
//     {
//       id: 2, // Adjust based on your database
//       name: 'user',
//       displayName: 'Khách hàng',
//       description: 'Tôi muốn tìm nhiếp ảnh gia và địa điểm chụp ảnh',
//       icon: '📸'
//     },
//     {
//       id: 3, // Adjust based on your database
//       name: 'photographer',
//       displayName: 'Nhiếp ảnh gia', 
//       description: 'Tôi muốn cung cấp dịch vụ chụp ảnh',
//       icon: '📷'
//     },
//     {
//       id: 4, // Adjust based on your database
//       name: 'locationowner',
//       displayName: 'Chủ địa điểm',
//       description: 'Tôi có địa điểm đẹp và muốn cho thuê chụp ảnh',
//       icon: '🏡'
//     }
//   ];

//   useEffect(() => {
//     loadRoles();
//   }, []);

//   const loadRoles = async () => {
//     try {
//       // Try to get roles from API, fallback to default
//       const roles = await AuthService.g();
//       // Filter only the roles we want to show for registration
//       const userRoles = roles.filter((role: any) => 
//         ['user', 'photographer', 'locationowner'].includes(role.name.toLowerCase())
//       );
//       setAvailableRoles(userRoles.length > 0 ? userRoles : defaultRoles);
//     } catch (error) {
//       console.warn('Could not load roles from API, using defaults:', error);
//       setAvailableRoles(defaultRoles);
//     }
//   };

//   const handleRoleSelect = (role: Role) => {
//     setSelectedRole(role.name);
//     setSelectedRoleId(role.id);
//   };

//   const handleSubmit = async () => {
//     if (!selectedRole || !selectedRoleId) {
//       setError('Vui lòng chọn vai trò của bạn');
//       return;
//     }

//     setLoading(true);
//     setError('');

//     try {
//       // Use the assign-roles API
//       await AuthService.assignRole(userId, selectedRole as any);
      
//       // Create additional profile based on role
//       if (selectedRole === 'photographer') {
//         // Create photographer profile with basic info
//         await createPhotographerProfile(userId);
//       } else if (selectedRole === 'locationowner') {
//         // Create location owner profile with basic info  
//         await createLocationOwnerProfile(userId);
//       }
      
//       onSuccess({ selectedRole, roleId: selectedRoleId, userId });
//     } catch (err: any) {
//       setError(err.message || 'Có lỗi xảy ra khi thiết lập vai trò');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const createPhotographerProfile = async (userId: number) => {
//     try {
//       // Call existing photographer creation API
//       await fetch('/api/Photographer', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${AuthService.getToken()}`
//         },
//         body: JSON.stringify({
//           userId,
//           availabilityStatus: 'available',
//           verificationStatus: 'pending'
//         })
//       });
//     } catch (error) {
//       console.warn('Could not create photographer profile:', error);
//     }
//   };

//   const createLocationOwnerProfile = async (userId: number) => {
//     try {
//       // Call existing location owner creation API  
//       await fetch('/api/LocationOwner/CreatedLocationOwnerId', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${AuthService.getToken()}`
//         },
//         body: JSON.stringify({
//           userId,
//           verificationStatus: 'pending'
//         })
//       });
//     } catch (error) {
//       console.warn('Could not create location owner profile:', error);
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <div className="text-center">
//         <h2 className="text-2xl font-bold mb-2">Chọn vai trò của bạn</h2>
//         <p className="text-gray-600">Hãy cho chúng tôi biết bạn muốn sử dụng SnapLink như thế nào?</p>
//       </div>

//       {error && (
//         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
//           {error}
//         </div>
//       )}

//       <div className="space-y-3">
//         {availableRoles.map((role) => (
//           <div
//             key={role.id}
//             className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
//               selectedRole === role.name
//                 ? 'border-blue-500 bg-blue-50'
//                 : 'border-gray-200 hover:border-gray-300'
//             }`}
//             onClick={() => handleRoleSelect(role)}
//           >
//             <div className="flex items-start space-x-3">
//               <div className="text-2xl">{role.icon}</div>
//               <div className="flex-1">
//                 <div className="flex items-center space-x-2">
//                   <h3 className="font-semibold text-lg">{role.displayName}</h3>
//                   {selectedRole === role.name && (
//                     <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
//                       <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
//                         <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                       </svg>
//                     </div>
//                   )}
//                 </div>
//                 <p className="text-gray-600 text-sm mt-1">{role.description}</p>
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>

//       <button
//         onClick={handleSubmit}
//         disabled={!selectedRole || loading}
//         className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
//       >
//         {loading ? 'Đang thiết lập...' : 'Tiếp tục'}
//       </button>
//     </div>
//   );
// }

