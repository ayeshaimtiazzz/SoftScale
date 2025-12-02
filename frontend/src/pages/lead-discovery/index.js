import React from "react";
import { Navigate } from "react-router-dom";
import { ROUTES } from "../../constants";
import TalentMatch from "../talent-match";

/**
 * Lead Discovery page - uses the talent-match functionality
 * This redirects to the talent-match component which handles lead discovery
 * through the backend /talent-match endpoint
 */
function LeadDiscovery() {
  // Since Lead Discovery uses the same functionality as Talent Match,
  // we use the TalentMatch component directly
  return <TalentMatch />;
}

export default LeadDiscovery;

