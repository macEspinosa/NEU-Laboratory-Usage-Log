# NEU Laboratory Usage Log System

## Project Overview
The **NEU Laboratory Usage Log System** is a digital management platform developed for **New Era University** to modernize laboratory access tracking.  

The system replaces traditional **paper-based logbooks** with a **real-time QR code–based entry mechanism**.

It consists of two main interfaces:

- **Professor's Scanner Module**
- **Administrative Dashboard**

🔗 **Live Project:**  
https://ais-pre-dpxippybkparxdhd6isyzu-578523291769.asia-southeast1.run.app/

---

# System Architecture and Features

## 1. QR Code–Based Authentication Module

The **faculty scanning interface** provides:

- Automated identification through **unique QR codes** assigned to each faculty member
- **Device camera integration** for fast identity verification
- **Timestamped logging** that records:
  - Faculty name
  - Room designation
  - Entry time

All logs are automatically stored in the database after successful authentication.

---

## 2. Administrative Dashboard

The **Admin Dashboard** allows administrators to manage and monitor laboratory usage across the university.

| Function | Description |
|--------|-------------|
| **Usage Analytics** | Interactive visualizations showing usage trends and room utilization |
| **Activity Monitoring** | Searchable real-time log of laboratory entries |
| **Faculty Management** | Centralized directory for managing faculty access |
| **QR Code Generation** | Tool for generating and printing faculty QR credentials |

---

## 3. System Configuration

Additional system configuration features include:

- **Room Assignment**  
  Dynamic configuration of scanner-to-room mappings

- **Interface Theming**  
  Light mode and dark mode support for different laboratory lighting conditions

---

# Technical Specifications

| Technology | Description |
|-----------|-------------|
| **Framework** | React with TypeScript |
| **Database** | Firebase Firestore (real-time synchronization) |
| **Authentication** | Restricted to `@neu.edu.ph` institutional accounts |
| **UI Design** | Tailwind CSS |
| **Animations** | Framer Motion |

---

# Institutional Benefits

The NEU Laboratory Usage Log System provides:

- **Accurate laboratory utilization data** for resource planning
- **Improved security** through verified QR-based access logging
- **Efficient faculty experience** with fast entry authentication
- **Real-time monitoring** for administrators

---

# Author

Developed for **New Era University Laboratory Management System**.

---

# License

This project is intended for **academic and institutional use**.