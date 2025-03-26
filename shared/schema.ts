import { pgTable, text, serial, integer, boolean, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema (keeping the existing one)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Coordinate type (longitude, latitude)
export type Coordinate = [number, number];

// Maneuver for turn-by-turn directions
export interface Maneuver {
  type: string;
  modifier?: string;
  location?: Coordinate;
  bearing_before?: number;
  bearing_after?: number;
  exit?: number;
}

// Step in a navigation route
export interface NavigationStep {
  distance: number;
  duration: number;
  geometry?: string;
  name?: string;
  instruction: string;
  maneuver?: Maneuver;
  waypoints?: Coordinate[];
}

// Transportation modes
export type TransportMode = 'driving' | 'walking' | 'cycling' | 'transit';

// Traffic severity levels
export type TrafficSeverity = 'low' | 'medium' | 'high';

// Route representation
export interface Route {
  distance: number;
  duration: number;
  geometry?: string;
  steps?: NavigationStep[];
  transportMode?: TransportMode;
  isSelected?: boolean;
  hasTraffic?: boolean;
  severity?: TrafficSeverity;
  delay?: number;
}

// Construction zone information
export interface ConstructionZone {
  id: string;
  location: Coordinate;
  description: string;
  severity: TrafficSeverity;
  startDate: string;
  endDate: string;
  affectedRoads?: string[];
}

// Schema for construction zones table
export const constructionZones = pgTable("construction_zones", {
  id: text("id").primaryKey(),
  location: jsonb("location").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  affectedRoads: jsonb("affected_roads"),
});

// Traffic update information
export interface TrafficUpdate {
  id: string;
  location: Coordinate;
  description: string;
  severity: TrafficSeverity;
  timestamp: string;
  speed?: number;
  congestion?: number;
}

// Schema for traffic updates table
export const trafficUpdates = pgTable("traffic_updates", {
  id: text("id").primaryKey(),
  location: jsonb("location").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(),
  timestamp: text("timestamp").notNull(),
  speed: real("speed"),
  congestion: real("congestion"),
});

// Insert schemas
export const insertConstructionZoneSchema = createInsertSchema(constructionZones);
export const insertTrafficUpdateSchema = createInsertSchema(trafficUpdates);

// Types from insert schemas
export type InsertConstructionZone = z.infer<typeof insertConstructionZoneSchema>;
export type InsertTrafficUpdate = z.infer<typeof insertTrafficUpdateSchema>;

// Types from select schemas
export type ConstructionZoneRecord = typeof constructionZones.$inferSelect;
export type TrafficUpdateRecord = typeof trafficUpdates.$inferSelect;
