import React, { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import PricePrediction from "../../price-prediction";

const CatalogPrice = () => {
  const { itemType, profileData } = useOutletContext();

  const initialPrefill = useMemo(() => {
    if (!profileData || itemType !== "project") return null;
    return {
      project_description: profileData.project_description || profileData.description || "",
      features: profileData.required_skills || profileData.skills || "",
      domain: profileData.domain || profileData.preferred_domain || "",
      title: profileData.title || profileData.project_title || "",
    };
  }, [profileData, itemType]);

  if (itemType !== "project" || !initialPrefill) {
    return null;
  }

  return <PricePrediction embedded initialPrefill={initialPrefill} />;
};

export default CatalogPrice;
