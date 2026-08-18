import React, { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import TalentMatch from "../../talent-match";

const CatalogLeadDiscovery = () => {
  const { itemType, itemId, title } = useOutletContext();

  const initialSelectedPost = useMemo(
    () => ({
      id: itemId,
      type: itemType,
      title: title || "",
    }),
    [itemId, itemType, title]
  );

  return (
    <TalentMatch
      key={`catalog-${itemType}-${itemId}`}
      initialSelectedPost={initialSelectedPost}
      embedded
      lockSelection
    />
  );
};

export default CatalogLeadDiscovery;
