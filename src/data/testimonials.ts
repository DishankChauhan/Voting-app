import { TestimonialAuthor } from "@/components/ui/testimonial-card";

export const testimonials: Array<{
  author: TestimonialAuthor;
  text: string;
  href?: string;
}> = [
  {
    author: {
      name: "Alex Thompson",
      handle: "@alex_eth",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    },
    text: "This governance platform has transformed how our community makes decisions. Transparent, secure, and incredibly easy to use.",
  },
  {
    author: {
      name: "Sarah Chen",
      handle: "@sarah_dao",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    },
    text: "The delegation feature is a game-changer for busy community members. I can now ensure my voice is heard without needing to vote on every proposal.",
  },
  {
    author: {
      name: "Michael Rodriguez",
      handle: "@mrod_crypto",
      avatar: "https://randomuser.me/api/portraits/men/67.jpg",
    },
    text: "I've been part of many DAOs, but this platform provides the smoothest voting experience by far. The UI is intuitive and the proposal tracking is excellent.",
  },
  {
    author: {
      name: "Emma Wilson",
      handle: "@emma_w",
      avatar: "https://randomuser.me/api/portraits/women/22.jpg",
    },
    text: "As a community manager, I appreciate how simple it is to create proposals and gather feedback. It's helped us make more inclusive decisions.",
  },
  {
    author: {
      name: "David Kumar",
      handle: "@dk_blockchain",
      avatar: "https://randomuser.me/api/portraits/men/45.jpg",
    },
    text: "The weighted voting system ensures that stakeholders have appropriate influence while still giving everyone a voice. Perfectly balanced.",
  },
  {
    author: {
      name: "Olivia Parker",
      handle: "@olivia_p",
      avatar: "https://randomuser.me/api/portraits/women/4.jpg",
    },
    text: "We implemented this for our NFT community, and it's been amazing watching participation rates soar. People actually want to be involved now!",
  },
]; 