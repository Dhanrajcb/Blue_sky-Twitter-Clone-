import { FaRegComment } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { FaRegHeart } from "react-icons/fa";
import { FaRegBookmark, FaBookmark } from "react-icons/fa6";
import { FaShare } from "react-icons/fa";
import { FaTrash } from "react-icons/fa";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import LoadingSpinner from "./LoadingSpinner";
import { formatPostDate } from "../../utils/date";

const Post = ({ post, reposter, authUser }) => {
	const queryClient = useQueryClient();
	const postOwner = post.user;

	const isLiked = authUser ? post.likes.includes(authUser._id) : false;
	const isMyPost = authUser ? authUser._id === post.user._id : false;
	const [comment, setComment] = useState("");
	const [isSaved, setIsSaved] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isReposting, setIsReposting] = useState(false);
	const [repostCount, setRepostCount] = useState(post.reposts ? post.reposts.length : 0);
	const [hasReposted, setHasReposted] = useState(false);

	useEffect(() => {
		if (authUser) {
			setIsSaved(post.savedBy?.includes(authUser._id));
			setHasReposted(post.reposts ? post.reposts.includes(authUser._id) : false);
		}
	}, [authUser, post.savedBy, post.reposts]);

	const formattedDate = formatPostDate(post.createdAt);

	const { mutate: deletePost, isPending: isDeleting } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch(`/api/posts/${post._id}`, {
					method: "DELETE",
				});
				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: () => {
			toast.success("Post deleted successfully");
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
	});

	const { mutate: likePost, isPending: isLiking } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch(`/api/posts/like/${post._id}`, {
					method: "POST",
				});
				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: (updatedLikes) => {
			// this is not the best UX, bc it will refetch all posts
			// queryClient.invalidateQueries({ queryKey: ["posts"] });

			// instead, update the cache directly for that post
			queryClient.setQueryData(["posts"], (oldData) => {
				return oldData.map((p) => {
					if (p._id === post._id) {
						return { ...p, likes: updatedLikes };
					}
					return p;
				});
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const { mutate: commentPost, isPending: isCommenting } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch(`/api/posts/comment/${post._id}`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ text: comment }),
				});
				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
				return data;
			} catch (error) {
				throw new Error(error);
			}
		},
		onSuccess: () => {
			toast.success("Comment posted successfully");
			setComment("");
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const handleDeletePost = () => {
		deletePost();
	};

	const handlePostComment = (e) => {
		e.preventDefault();
		if (isCommenting) return;
		commentPost();
	};

	const handleLikePost = () => {
		if (isLiking) return;
		likePost();
	};

	const handleSavePost = async () => {
		if (isSaving) return;
		setIsSaving(true);
		try {
			const res = await fetch(`/api/posts/save/${post._id}`, {
				method: "POST",
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			setIsSaved(data.saved);
			queryClient.invalidateQueries({ queryKey: ["posts"] });
			toast.success(data.saved ? "Post saved!" : "Post unsaved!");
		} catch (error) {
			toast.error(error.message);
		} finally {
			setIsSaving(false);
		}
	};

	const handleRepost = async () => {
		if (isReposting) return;
		setIsReposting(true);
		try {
			const res = await fetch(`/api/posts/repost/${post._id}`, {
				method: "POST",
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			setRepostCount(data.length);
			setHasReposted(data.includes(authUser._id));
			toast.success(hasReposted ? "Repost removed!" : "Reposted!");
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		} catch (error) {
			toast.error(error.message);
		} finally {
			setIsReposting(false);
		}
	};

	const handleSharePost = async () => {
		const postUrl = `${window.location.origin}/post/${post._id}`;
		try {
			await navigator.clipboard.writeText(postUrl);
			toast.success("Post link copied to clipboard!");
		} catch {
			toast.error("Failed to copy link");
		}
	};

	return (
		<>
			{reposter && reposter._id !== postOwner._id && (
				<div className="text-xs text-green-500 mb-1 flex items-center gap-1">
					{reposter.profileImg && (
						<img src={reposter.profileImg} alt="reposter" className="w-5 h-5 rounded-full inline-block" />
					)}
					Reposted by {reposter._id === authUser?._id ? "You" : <span className="font-bold">@{reposter.username}</span>}
				</div>
			)}
			<div className='flex gap-2 items-start p-4 border-b border-gray-700'>
				<div className='avatar'>
					<Link to={`/profile/${postOwner.username}`} className='w-8 rounded-full overflow-hidden'>
						<img src={postOwner.profileImg || "/avatar-placeholder.png"} />
					</Link>
				</div>
				<div className='flex flex-col flex-1'>
					<div className='flex gap-2 items-center'>
						<Link to={`/profile/${postOwner.username}`} className='font-bold'>
							{postOwner.fullName}
						</Link>
						<span className='text-gray-700 flex gap-1 text-sm'>
							<Link to={`/profile/${postOwner.username}`}>@{postOwner.username}</Link>
							<span>·</span>
							<span>{formattedDate}</span>
						</span>
						{isMyPost && (
							<span className='flex justify-end flex-1'>
								{!isDeleting && (
									<FaTrash className='cursor-pointer hover:text-red-500' onClick={handleDeletePost} />
								)}

								{isDeleting && <LoadingSpinner size='sm' />}
							</span>
						)}
					</div>
					<div className='flex flex-col gap-3 overflow-hidden'>
						<span>{post.text}</span>
						{post.img && (
							<img
								src={post.img}
								className='h-80 object-contain rounded-lg border border-gray-700'
								alt=''
							/>
						)}
					</div>
					<div className='flex justify-between mt-3'>
						<div className='flex gap-4 items-center w-2/3 justify-between'>
							<div
								className='flex gap-1 items-center cursor-pointer group'
								onClick={() => document.getElementById("comments_modal" + post._id).showModal()}
							>
								<FaRegComment className='w-4 h-4  text-slate-500 group-hover:text-sky-400' />
								<span className='text-sm text-slate-500 group-hover:text-sky-400'>
									{post.comments.length}
								</span>
							</div>
							{/* We're using Modal Component from DaisyUI */}
							<dialog id={`comments_modal${post._id}`} className='modal border-none outline-none'>
								<div className='modal-box rounded border border-gray-600'>
									<h3 className='font-bold text-lg mb-4'>COMMENTS</h3>
									<div className='flex flex-col gap-3 max-h-60 overflow-auto'>
										{post.comments.length === 0 && (
											<p className='text-sm text-slate-500'>
												No comments yet 🤔 Be the first one 😉
											</p>
										)}
										{post.comments.map((comment) => (
											<div key={comment._id} className='flex gap-2 items-start'>
												<div className='avatar'>
													<div className='w-8 rounded-full'>
														<img
															src={comment.user.profileImg || "/avatar-placeholder.png"}
														/>
													</div>
												</div>
												<div className='flex flex-col'>
													<div className='flex items-center gap-1'>
														<span className='font-bold'>{comment.user.fullName}</span>
														<span className='text-gray-700 text-sm'>
															@{comment.user.username}
														</span>
													</div>
													<div className='text-sm'>{comment.text}</div>
												</div>
											</div>
										))}
									</div>
									<form
										className='flex gap-2 items-center mt-4 border-t border-gray-600 pt-2'
										onSubmit={handlePostComment}
									>
										<textarea
											className='textarea w-full p-1 rounded text-md resize-none border focus:outline-none  border-gray-800'
											placeholder='Add a comment...'
											value={comment}
											onChange={(e) => setComment(e.target.value)}
										/>
										<button className='btn btn-primary rounded-full btn-sm text-white px-4'>
											{isCommenting ? <LoadingSpinner size='md' /> : "Post"}
										</button>
									</form>
								</div>
								<form method='dialog' className='modal-backdrop'>
									<button className='outline-none'>close</button>
								</form>
							</dialog>
							<div className='flex gap-1 items-center group cursor-pointer' onClick={handleRepost}>
								{isReposting ? (
									<LoadingSpinner size='sm' />
								) : (
									<BiRepost className={`w-6 h-6 text-slate-500 group-hover:text-green-500 ${hasReposted ? "text-green-500" : ""}`} />
								)}
								<span className={`text-sm group-hover:text-green-500 ${hasReposted ? "text-green-500" : "text-slate-500"}`}>{repostCount}</span>
							</div>
							<div className='flex gap-1 items-center group cursor-pointer' onClick={handleLikePost}>
								{isLiking && <LoadingSpinner size='sm' />}
								{!isLiked && !isLiking && (
									<FaRegHeart className='w-4 h-4 cursor-pointer text-slate-500 group-hover:text-pink-500' />
								)}
								{isLiked && !isLiking && (
									<FaRegHeart className='w-4 h-4 cursor-pointer text-pink-500 ' />
								)}

								<span
									className={`text-sm  group-hover:text-pink-500 ${
										isLiked ? "text-pink-500" : "text-slate-500"
									}`}
								>
									{post.likes.length}
								</span>
							</div>
						</div>
						<div className='flex w-1/3 justify-end gap-2 items-center'>
							<button onClick={handleSharePost} title="Share post">
								<FaShare className='w-4 h-4 text-slate-500 cursor-pointer' />
							</button>
							<button onClick={handleSavePost} title={isSaved ? "Unsave post" : "Save post"} disabled={isSaving}>
								{isSaved ? (
									<FaBookmark className='w-4 h-4 text-blue-500 cursor-pointer' />
								) : (
									<FaRegBookmark className='w-4 h-4 text-slate-500 cursor-pointer' />
								)}
							</button>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};
export default Post;
