// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// versions:
//   protoc-gen-ts_proto  v2.6.0
//   protoc               v3.12.4
// source: keys.proto

/* eslint-disable */

export const protobufPackage = "Keys";

export enum Role {
  ROLE_NONE = 0,
  ROLE_SERVICE = 1,
  ROLE_OWNER = 2,
  ROLE_DRIVER = 3,
  ROLE_FM = 4,
  ROLE_VEHICLE_MONITOR = 5,
  ROLE_CHARGING_MANAGER = 6,
  UNRECOGNIZED = -1,
}

export function roleFromJSON(object: any): Role {
  switch (object) {
    case 0:
    case "ROLE_NONE":
      return Role.ROLE_NONE;
    case 1:
    case "ROLE_SERVICE":
      return Role.ROLE_SERVICE;
    case 2:
    case "ROLE_OWNER":
      return Role.ROLE_OWNER;
    case 3:
    case "ROLE_DRIVER":
      return Role.ROLE_DRIVER;
    case 4:
    case "ROLE_FM":
      return Role.ROLE_FM;
    case 5:
    case "ROLE_VEHICLE_MONITOR":
      return Role.ROLE_VEHICLE_MONITOR;
    case 6:
    case "ROLE_CHARGING_MANAGER":
      return Role.ROLE_CHARGING_MANAGER;
    case -1:
    case "UNRECOGNIZED":
    default:
      return Role.UNRECOGNIZED;
  }
}

export function roleToJSON(object: Role): string {
  switch (object) {
    case Role.ROLE_NONE:
      return "ROLE_NONE";
    case Role.ROLE_SERVICE:
      return "ROLE_SERVICE";
    case Role.ROLE_OWNER:
      return "ROLE_OWNER";
    case Role.ROLE_DRIVER:
      return "ROLE_DRIVER";
    case Role.ROLE_FM:
      return "ROLE_FM";
    case Role.ROLE_VEHICLE_MONITOR:
      return "ROLE_VEHICLE_MONITOR";
    case Role.ROLE_CHARGING_MANAGER:
      return "ROLE_CHARGING_MANAGER";
    case Role.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}
