/* config.js — RT-04 FIX: Export as ES Module to prevent global mutation */
const APP_CONFIG = Object.freeze({
    API_BASE_URL: "https://api.galalabot.app/api/v1",
    ENDPOINTS: Object.freeze({
        /* ── Student / Auth ── */
        STUDENT_LOGIN:            "/student/login",
        STUDENT_LOGOUT:           "/student/logout",
        STUDENT_PROFILE:          "/student/profile",
        STUDENT_VEHICLE:          "/student/vehicle",
        STUDENT_VEHICLE_REQUESTS: "/student/vehicle-requests",
        STUDENT_VEHICLE_HISTORY:  "/student/vehicle-requests/history",
        
        /* ── Student Chatbot ── */
        STUDENT_CHATS:            "/student/chats", 
        
        /* ── Guest Chatbot ── */
        GUEST_CHAT_MESSAGES:      "/guest/chat/messages",
    }),
});

export default APP_CONFIG;
