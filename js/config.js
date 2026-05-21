/* config.js — RT-04 FIX: Export as ES Module to prevent global mutation */
const APP_CONFIG = Object.freeze({
    API_BASE_URL: "https://api.eightyeightevents.me/api/v1",
    AI_BASE_URL:  "https://ai.eightyeightevents.me",
    ENDPOINTS: Object.freeze({
        STUDENT_LOGIN:            "/student/login",
        STUDENT_LOGOUT:           "/student/logout",
        STUDENT_PROFILE:          "/student/profile",
        STUDENT_VEHICLE:          "/student/vehicle",
        STUDENT_VEHICLE_REQUESTS: "/student/vehicle-requests",
        STUDENT_VEHICLE_HISTORY:  "/student/vehicle-requests/history",
    })
});

export default APP_CONFIG;
