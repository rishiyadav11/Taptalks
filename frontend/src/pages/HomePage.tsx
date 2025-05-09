import { useEffect, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Message {
  id: number;
  text: string;
  time: string;
  isUser: boolean;
}

const HomePage = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Welcome to Chattrix!", time: "6:30 pm", isUser: false },
    { id: 2, text: "Hey there 👋", time: "6:30 pm", isUser: true },
    { id: 3, text: "What’s Chattrix all about?", time: "6:31 pm", isUser: true },
    {
      id: 4,
      text: "It's a blazing fast real-time chat app built for developers, teams, and communities 🚀",
      time: "6:32 pm",
      isUser: false,
    },
    { id: 5, text: "Sounds awesome! How do I join?", time: "6:33 pm", isUser: true },
  ]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    gsap.fromTo(
      ".fade-up",
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        stagger: 0.2,
        scrollTrigger: {
          trigger: ".fade-up",
          start: "top 80%",
        },
      }
    );
  }, []);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMessageObj: Message = {
        id: messages.length + 1,
        text: newMessage,
        time: new Date().toLocaleTimeString(),
        isUser: true,
      };
      setMessages((prevMessages) => [...prevMessages, newMessageObj]);
      setNewMessage(""); // Clear input field
    }
  };

  return (
    <div className="min-h-screen pt-20 bg-gray-950 bg-[url('https://www.jsmastery.pro/assets/dev-accelerator/images/course-hero-grid.webp')] text-white p-8 relative overflow-hidden">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 fade-up">
          <div className="inline-block bg-gray-800/50 rounded-full p-2 mb-6">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-6xl font-bold mb-4">Welcome to<br />Chattrix</h1>
          <p className="text-gray-400 text-lg mb-8">
            Chattrix is your go-to place for seamless real-time conversations. Whether it's for teams, friends, or open communities — we've got you covered.
          </p>
        </div>

        {/* Chat Interface */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 mb-8 fade-up">
          <div className="space-y-6 mb-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
                <div className={`flex items-start gap-3 max-w-[80%] ${message.isUser ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 ${message.isUser ? "bg-pink-200/20" : "bg-purple-200/20"}`}>
                    <div className="w-full h-full rounded-full bg-purple-500/20 overflow-hidden">
                      <img
                        src={
                          message.isUser
                            ? "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80"
                            : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdjrl1eRvzj0Flt2tDvYPAY6XNUiIENnlFJgeuWu6_HhAsFHADBUGjGPzwC58P3uiuB1E&usqp=CAU"
                        }
                        alt=""
                      />
                    </div>
                  </div>
                  <div>
                    <div className={`rounded-2xl px-4 py-2 ${message.isUser ? "bg-pink-200/20" : "bg-gray-800/50"}`}>
                      <p className="text-white">{message.text}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{message.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="flex gap-4 items-center">
            <input
              type="text"
              placeholder="Write a message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-gray-800/50 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-200/20"
            />
            <button
              onClick={handleSendMessage}
              className="bg-pink-200/20 hover:bg-pink-200/30 text-white p-3 rounded-lg transition-colors duration-200"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-16 text-center fade-up">
          <h2 className="text-4xl font-bold mb-4">Why Chattrix?</h2>
          <p className="text-gray-400 mb-8">Built for speed, reliability, and simplicity.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Real-time Messaging", desc: "Send and receive messages instantly with no delay." },
              { title: "Community Focused", desc: "Built to foster conversations within teams and open groups." },
              { title: "Secure & Scalable", desc: "Your data stays private and the app scales with your needs." },
            ].map((feature, i) => (
              <div key={i} className="bg-gray-800/50 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="mb-16 text-center fade-up">
          <h2 className="text-4xl font-bold mb-4">What People Say</h2>
          <p className="text-gray-400 mb-8">Loved by devs, teams, and communities worldwide.</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              { name: "Aman", text: "Chattrix changed the way our dev team communicates. Super fast and clean UI!" },
              { name: "Sofia", text: "I started a public community on Chattrix — best decision ever!" },
            ].map((t, i) => (
              <div key={i} className="bg-gray-800/40 p-6 rounded-xl text-left">
                <p className="text-gray-300 italic mb-2">"{t.text}"</p>
                <p className="text-gray-500 text-sm">— {t.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Join Section */}
        <div className="text-center fade-up">
          <h2 className="text-4xl font-bold mb-4">Ready to start chatting?</h2>
          <p className="text-gray-400 mb-6">Join our growing community of developers and creators today.</p>
          <Link
            to="/login"
            className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-xl font-semibold transition duration-200"
          >
            Join Chattrix Now
          </Link>
        </div>
      


      </div>
        <footer className=" backdrop-blur-md py-6 mt-12">
  <div className="max-w-4xl mx-auto flex items-center justify-between text-lg font-semibold text-white">
    {/* Logo and Name */}
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
        <span className="text-pink-500 text-2xl font-bold">R</span>
      </div>
      <span className="text-xl font-semibold">Chattrix</span>
    </div>

    {/* Developer Info */}
    <div className="text-sm text-gray-300">
      <span>Developed by <a href="https://github.com/rishiyadav11/" className="text-pink-500 hover:text-pink-400"><strong>Rishi Yadav</strong></a></span>
    </div>
  </div>
</footer>
    </div>
  );
};

export default HomePage;
