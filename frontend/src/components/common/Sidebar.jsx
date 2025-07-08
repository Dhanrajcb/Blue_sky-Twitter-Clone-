import XSvg from "../svgs/X";

import { MdHomeFilled } from "react-icons/md";
import { IoNotifications } from "react-icons/io5";
import { FaUser } from "react-icons/fa";
import { Link } from "react-router-dom";
import { BiLogOut } from "react-icons/bi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useState } from "react";
import { useDebounce } from "@uidotdev/usehooks";

const Sidebar = () => {
	const queryClient = useQueryClient();
	const [searchTerm, setSearchTerm] = useState("");
	const debouncedSearch = useDebounce(searchTerm, 300);

	const { mutate: logout } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch("/api/auth/logout", {
					method: "POST",
				});
				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["authUser"] });
		},
		onError: () => {
			toast.error("Logout failed");
		},
	});

	const { data: authUser } = useQuery({ queryKey: ["authUser"] });

	const { data: users = [] } = useQuery({
		queryKey: ["searchUsers", debouncedSearch],
		queryFn: async () => {
			if (!debouncedSearch) return [];
			const res = await fetch(`/api/users/search?q=${debouncedSearch}`);
			const data = await res.json();
			return data;
		},
		enabled: !!debouncedSearch,
	});

	return (
		<div className='md:flex-[2_2_0] w-18 max-w-52'>
			<div className='sticky top-0 left-0 h-screen flex flex-col border-r border-gray-700 w-20 md:w-full'>
				<Link to='/' className='flex justify-center md:justify-start items-center gap-2'>
					<XSvg className='px-2 w-12 h-12 rounded-full fill-white hover:bg-stone-900' />
					<span className='hidden md:inline text-2xl font-bold text-white'>Blue Sky</span>
				</Link>

				{/* Search Bar */}
				<div className="px-4 py-2 relative">
					<input
						type="text"
						placeholder="Search users"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full px-3 py-1.5 rounded-full bg-[#16181C] text-white border border-gray-700 focus:outline-none"
					/>
					{searchTerm && users.length > 0 && (
						<ul className="absolute mt-1 bg-black border border-gray-700 rounded-md w-full z-50 max-h-60 overflow-y-auto">
							{users.map((user) => (
								<Link
									to={`/profile/${user.username}`}
									key={user._id}
									onClick={() => setSearchTerm("")}
									className="flex items-center px-3 py-2 hover:bg-[#1e1e1e] cursor-pointer"
								>
									<img
										src={user.profilePic || "/avatar-placeholder.png"}
										alt={user.username}
										className="w-8 h-8 rounded-full mr-2"
									/>
									<div>
										<p className="text-white text-sm font-semibold">{user.username}</p>
									</div>
								</Link>
							))}
						</ul>
					)}
				</div>

				{/* Navigation Links */}
				<ul className='flex flex-col gap-3 mt-2'>
					<li className='flex justify-center md:justify-start'>
						<Link
							to='/'
							className='flex gap-3 items-center hover:bg-stone-900 transition-all rounded-full duration-300 py-2 pl-2 pr-4 max-w-fit cursor-pointer'
						>
							<MdHomeFilled className='w-8 h-8' />
							<span className='text-lg hidden md:block'>Home</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<Link
							to='/notifications'
							className='flex gap-3 items-center hover:bg-stone-900 transition-all rounded-full duration-300 py-2 pl-2 pr-4 max-w-fit cursor-pointer'
						>
							<IoNotifications className='w-6 h-6' />
							<span className='text-lg hidden md:block'>Notifications</span>
						</Link>
					</li>
					<li className='flex justify-center md:justify-start'>
						<Link
							to={`/profile/${authUser?.username}`}
							className='flex gap-3 items-center hover:bg-stone-900 transition-all rounded-full duration-300 py-2 pl-2 pr-4 max-w-fit cursor-pointer'
						>
							<FaUser className='w-6 h-6' />
							<span className='text-lg hidden md:block'>Profile</span>
						</Link>
					</li>
				</ul>

				{/* User Info and Logout */}
				{authUser && (
					<Link
						to={`/profile/${authUser.username}`}
						className='mt-auto mb-10 flex gap-2 items-start transition-all duration-300 hover:bg-[#181818] py-2 px-4 rounded-full'
					>
						<div className='avatar hidden md:inline-flex'>
							<div className='w-8 rounded-full'>
								<img src={authUser?.profileImg || "/avatar-placeholder.png"} />
							</div>
						</div>
						<div className='flex justify-between flex-1'>
							<div className='hidden md:block'>
								<p className='text-white font-bold text-sm w-20 truncate'>{authUser?.fullName}</p>
								<p className='text-slate-500 text-sm'>@{authUser?.username}</p>
							</div>
							<BiLogOut
								className='w-5 h-5 cursor-pointer'
								onClick={(e) => {
									e.preventDefault();
									logout();
								}}
							/>
						</div>
					</Link>
				)}
			</div>
		</div>
	);
};

export default Sidebar;
