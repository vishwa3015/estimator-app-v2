import { useState, useEffect } from "react";
import { GHLCredentials, GHLContact } from "@/types/ghl";
import { ghlService } from "@/services/ghl";
import AppHeader from "./AppHeader";
import ContactsList from "./ContactsList";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface JobsProps {
  credentials: GHLCredentials;
  onDisconnect: () => void;
}

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const Jobs = ({ credentials, onDisconnect }: JobsProps) => {
  const [selectedContact, setSelectedContact] = useState<GHLContact | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [estimates, setEstimates] = useState([]);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const contactId = searchParams.get("contactId");

    if (contactId && (!selectedContact || selectedContact.id !== contactId)) {
      loadContactById(contactId);
    }
  }, [location.search]);

  useEffect(() => {
    const fetchEstimates = async () => {
      const { data, error } = await supabase
        .from("estimate_documents_v2")
        .select(
          "id, user_id, config_id, opportunity_id, contact_id, status, version, config_data, created_at, updated_at",
        )
        .eq("contact_id", selectedContact?.id);
      if (error) {
        alert(error.message);
        return;
      }
      setEstimates(data);
    };

    fetchEstimates();
  }, [selectedContact]);

  useEffect(() => {
    const fetchLocationName = async () => {
      try {
        const locationDetails = await ghlService.getLocationDetails(credentials);
        if (locationDetails && locationDetails.name) {
          setLocationName(locationDetails.name);
        }
      } catch (error) {
        console.error("Error fetching location details:", error);
      }
    };

    fetchLocationName();
  }, [credentials]);

  const loadContactById = async (contactId: string) => {
    if (!contactId) return;

    setIsLoading(true);
    try {
      const detailedContact = await ghlService.getContactById(credentials, contactId);
      if (detailedContact) {
        setSelectedContact(detailedContact);
      } else {
        toast({
          title: "Error",
          description: "Contact not found",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching contact details:", error);
      toast({
        title: "Error",
        description: "Failed to load contact details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectContact = async (contact: GHLContact) => {
    await loadContactById(contact.id);
  };

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold tracking-tight">
          {selectedContact
            ? selectedContact.name ||
              `${selectedContact.firstName || ""} ${selectedContact.lastName || ""}`.trim() ||
              "Contact Details"
            : "Select a Contact"}
        </h2>
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen">
        <AppHeader credentials={credentials} onDisconnect={onDisconnect} locationName={locationName} />
        <div className="flex-1 p-4 overflow-y-auto">
          {renderHeader()}
          <ContactsList
            credentials={credentials}
            onSelectContact={handleSelectContact}
            selectedContactId={selectedContact?.id}
          />
          {selectedContact && (
            <>
              <div className="mt-4 p-4 bg-card rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Name:</strong>{" "}
                    {selectedContact.name ||
                      `${selectedContact.firstName || ""} ${selectedContact.lastName || ""}`.trim() ||
                      "N/A"}
                  </p>
                  <p>
                    <strong>Email:</strong> {selectedContact.email || "N/A"}
                  </p>
                  <p>
                    <strong>Phone:</strong> {selectedContact.phone || "N/A"}
                  </p>
                  <p>
                    <strong>ID:</strong> {selectedContact.id}
                  </p>
                </div>
                <div className="mt-4">
                  <Button
                    onClick={() => navigate(`/create-estimate-for-contact/${selectedContact.id}`)}
                    className="gap-2 w-full"
                  >
                    <FileText className="h-4 w-4" />
                    Create Estimate
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const handleEdit = (estimate) => {
    navigate(`/create-estimate-for-contact/${selectedContact.id}/${estimate.id}`);
  };

  const getStatusChipClasses = (status) => {
    if(status === 'sent' || status === 'approved' || status === 'accepted') {
      return `bg-green-100 text-green-700`
    } else if (status === 'declined') {
      return `bg-red-100 text-red-600`
    } else {
      return `bg-gray-100 text-gray-600`
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <AppHeader credentials={credentials} onDisconnect={onDisconnect} locationName={locationName} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r overflow-y-auto">
          <ContactsList
            credentials={credentials}
            onSelectContact={handleSelectContact}
            selectedContactId={selectedContact?.id}
          />
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          {renderHeader()}
          {selectedContact ? (
            <>
              <div className="space-y-6">
                <div className="bg-card p-6 rounded-lg border">
                  <h3 className="text-xl font-semibold mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Name</label>
                      <p className="text-base">
                        {selectedContact.name ||
                          `${selectedContact.firstName || ""} ${selectedContact.lastName || ""}`.trim() ||
                          "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-base">{selectedContact.email || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <p className="text-base">{selectedContact.phone || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Contact ID</label>
                      <p className="text-base font-mono text-sm">{selectedContact.id}</p>
                    </div>
                    {selectedContact.location && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Address</label>
                          <p className="text-base">{selectedContact.location.address || "N/A"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">City, State</label>
                          <p className="text-base">
                            {`${selectedContact.location.city || ""} ${selectedContact.location.state || ""}`.trim() ||
                              "N/A"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  {selectedContact.tags && selectedContact.tags.length > 0 && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-muted-foreground">Tags</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedContact.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-6">
                    <Button
                      onClick={() => navigate(`/create-estimate-for-contact/${selectedContact.id}`)}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Create Estimate
                    </Button>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-card rounded-lg border">
                <h3 className="text-xl font-semibold mb-4">Saved Estimates</h3>
                {estimates.length <= 0 && (
                  <div className="w-full mt-3">
                    <h3 className="text-center">No Estimates yet</h3>
                  </div>
                )}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {estimates.map((estimate) => (
                    <div className="border rounded-2xl p-5 bg-white shadow hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <h2 className="text-lg font-medium text-gray-800">
                          {estimate?.config_data?.title || "Untitled"}
                        </h2>
                        <button
                          onClick={() => handleEdit(estimate)} // replace with your function
                          className="px-3 py-1 text-sm rounded-lg bg-primary text-white transition-colors"
                        >
                          Edit
                        </button>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium text-gray-700">Last Updated:</span>{" "}
                          {formatDate(estimate?.updated_at)}
                        </p>
                        <p>
                          <span className="font-medium text-gray-700">Created:</span> {formatDate(estimate?.created_at)}
                        </p>
                        <p>
                          <span className="font-medium text-gray-700">Status:</span>{" "}
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusChipClasses(estimate?.status)}`}
                          >
                            {estimate?.status}
                          </span>
                        </p>
                        <p>
                          <span className="font-medium text-gray-700">Version:</span> {estimate?.version}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Select a contact from the sidebar to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Jobs;
