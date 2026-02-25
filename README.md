CSCI 412: Senior Seminar
Project Proposal
Ayoyemi F.Hamzat
Project Title
Chat-Me: A Real-Time Messaging and Video Chat Web Application
Problem Description and Motivation
Messaging has become one of the main ways people communicate. Apps like Instagram, iMessage and Whatsapp make it easy to send direct messages, share media, and even jump into video calls. However, most of us use these platforms without ever understanding how they actually work behind the scenes.
The goal of this project is to build Chat-Me, a real-time messaging web application inspired by the Instagram chat feature. I want to understand how real-time communication works at a deeper level using proper socket programming, especially how messages are delivered instantly and how video calls connect two users directly.
This project is also important to me because it combines both frontend and backend development. It will allow me to build a full-stack system from scratch and deploy it as a working product. Instead of just building another simple app, this project focuses on live communication, which is more closer to real-world applications like WhatsApp or Slack.
Final Product Description
The final product will be a fully functional web-based chat application where users can:
● Create an account and log in securely
● Upload a profile picture
● See a list of other users
● Send and receive real-time private messages
● View online/offline status
● See typing indicators
The interface will feel similar to the conventional messaging apps, with a left sidebar showing conversations and a main chat area displaying messages.
The application will be accessible in modern web browsers on both desktop and mobile devices. A live demo of the deployed app will be presented at the end of the semester.
System Architecture
The system will follow a three-layer architecture similar to the structure shown in the sample proposal
Frontend Layer: Handles user interaction and UI rendering.
● Built using Angular
● Styled with TailwindCSS and Angular Material
Backend Layer: Handles business logic and real-time communication.
● Built with ASP.NET Core Web API
● Implements authentication using JWT
● Uses SignalR for real-time messaging
● Integrates WebRTC for video calling
Data Layer: Stores application data.
● SQLite during development
● Can be upgraded to PostgreSQL or SQL Server for deployment
● Uses Entity Framework Core for database interaction
The frontend communicates with the backend using REST APIs for authentication and data fetching. SignalR is used for real-time message updates and user presence notifications.
Platform and Technologies
● Platform: Web-based application
● Frontend: Angular 19, TypeScript, TailwindCSS, Angular Material
● Backend: ASP.NET Core Web API (.NET 9)
● Real-Time Communication: SignalR
● Authentication: JWT with ASP.NET Identity
● Database: SQLite (development), scalable option for deployment
● Version Control: Git and GitHub
Core Functionalities
Chat-Me will implement the following core features:
● User registration and login with JWT authentication
● Profile picture upload during registration
● Private one-to-one messaging
● Real-time message delivery using SignalR
● Online/offline user presence tracking
● Typing indicator in conversations
● Message history storage
● Mobile-responsive design
● PWA (Progressive Web App) support
Stretch Goals
If time allows, I plan to extend the project with additional features:
● Read receipts ("Seen" status like Instagram)
● Message reactions (emoji responses)
● Image and file sharing inside chats
● Group chat functionality
● Push notifications
● Message search functionality
● Dark mode toggle
● Peer-to-peer video calling using WebRTC
● End-to-end encryption research and basic implementation
These features are not required for the basic system but would make Chat-Me feel more like a production-ready messaging app.
Methodology and Development Plan
The project will be built incrementally. I will first focus on backend authentication and database setup. After that, I will implement the real-time chat functionality using SignalR. Once messaging works properly, I will move to the Angular frontend and design the UI.
Video calling will be implemented after core messaging is stable. The final phase will focus on deployment, polishing the interface, and fixing bugs.
Development progress will be tracked through GitHub commits, branches, and issues.
Testing and Validation
Testing will be included on unit bases as i am completing basic functionalities on both the frontend and backend:
● Unit testing backend API endpoints
● Testing authentication and JWT validation
● Testing SignalR real-time communication
● Manual testing of messaging and video calls between multiple users
Any bugs or known limitations will also be documented in the final report.
Use of AI Tools and External Resources
I may use AI tools to help debug code and understand documentation. However, all code will be reviewed and modified to ensure I fully understand the implementation.
Open-source libraries such as WebRTC documentation will be properly referenced in the GitHub repository and final report.
Timeline and Milestones
● Week 1–2: Project setup, environment installation (.NET, Angular, SQLite)
● Week 3–4: Implement backend authentication and database schema
● Week 5–6: Implement messaging system using SignalR
● Week 7–8: Build Angular frontend UI
● Week 9: Integrate frontend and backend
● Week 10: Midterm demo
● Week 11–12: Implement video calling
● Week 13: Add stretch features (if time permits)
● Week 14: Testing, documentation, final deployment and presentation
Expected Deliverables
By the end of the semester, the following will be submitted:
● A fully functional Chat-Me web application
● A public GitHub repository with clean documentation
● A final written report
● A live demonstration of the completed application
Expected Outcomes
This project will demonstrate my ability to design and build a complete full-stack system that includes authentication and real-time communication. It will also show my understanding of modern web technologies and how large-scale messaging platforms operate behind the scenes.
Chat-Me will not just be a school assignment. It will be a real, working application that reflects skills used in production-level software development. Chat-Me will also provide a real working and learning experience for me.
