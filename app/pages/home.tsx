import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HomeExperience, { type HomeConversation, type HomeMessage } from "@/components/homeExperience";

const avatarColors = ["#e48a67", "#a3b18a", "#8d9ec6", "#d4a373"];
type DatabaseMessage = { id: number; conversation_id: string; sender_id: string; body: string; created_at: string };

function formatMessageTime(timestamp: string) {
	return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default async function HomePage() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		redirect("/");
	}

	const { data: memberships } = await supabase
		.from("conversation_members")
		.select("conversation_id")
		.eq("user_id", user.id);
	const conversationIds = memberships?.map((membership) => membership.conversation_id) ?? [];
	const [{ data: conversations }, { data: allMembers }, { data: allMessages }] = await Promise.all([
		conversationIds.length ? supabase.from("conversations").select("id").in("id", conversationIds) : Promise.resolve({ data: [] }),
		conversationIds.length ? supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", conversationIds) : Promise.resolve({ data: [] }),
		conversationIds.length ? supabase.from("messages").select("id, conversation_id, sender_id, body, created_at").in("conversation_id", conversationIds).order("created_at", { ascending: true }) : Promise.resolve({ data: [] }),
	]);
	const memberIds = [...new Set((allMembers ?? []).map((member) => member.user_id))];
	const { data: profiles } = memberIds.length
		? await supabase.from("profiles").select("id, username, display_name, email").in("id", memberIds)
		: { data: [] };
	const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
	const membersByConversation = new Map<string, string[]>();
	(allMembers ?? []).forEach((member) => {
		const current = membersByConversation.get(member.conversation_id) ?? [];
		current.push(member.user_id);
		membersByConversation.set(member.conversation_id, current);
	});
	const latestMessages = new Map<string, DatabaseMessage>();
	((allMessages ?? []) as DatabaseMessage[]).forEach((message) => latestMessages.set(message.conversation_id, message));
	const homeConversations: HomeConversation[] = (conversations ?? []).map((conversation, index) => {
		const otherMemberId = (membersByConversation.get(conversation.id) ?? []).find((id) => id !== user.id);
		const profile = otherMemberId ? profileMap.get(otherMemberId) : undefined;
		const latestMessage = latestMessages.get(conversation.id);
		const name = profile?.display_name ?? profile?.username ?? "New conversation";
		return {
			id: conversation.id,
			participantId: otherMemberId,
			name,
			email: profile?.email ?? "",
			handle: profile?.username ? `@${profile.username}` : "youme member",
			preview: latestMessage?.body ?? "No messages yet",
			time: latestMessage ? formatMessageTime(latestMessage.created_at) : "New",
			lastMessageAt: latestMessage?.created_at,
			initials: name.split(" ").map((part: string) => part[0]).join("").slice(0, 2).toUpperCase(),
			color: avatarColors[index % avatarColors.length],
		};
	});
	const homeMessages: HomeMessage[] = ((allMessages ?? []) as DatabaseMessage[]).map((message) => ({
		id: String(message.id),
		conversationId: message.conversation_id,
		from: message.sender_id === user.id ? "me" : "them",
		text: message.body,
		time: formatMessageTime(message.created_at),
		createdAt: message.created_at,
	}));

	return <HomeExperience email={user.email ?? ""} userId={user.id} conversations={homeConversations} messages={homeMessages} />;
}
