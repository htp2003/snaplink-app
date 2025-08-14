// screens/PhotographerEventScreen.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  TextInput,
  Alert,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useEventDiscovery,
  useEventSearch,
  usePhotographerApplications,
  useApplicationActions,
  useEventDetail,
  useApprovedPhotographers,
} from "../../hooks/usePhotographerEvent";
import {
  LocationEvent,
  EventApplication,
  ApplicationStatus,
  EventStatus,
} from "../../types/photographerEvent";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  DollarSign,
  Search,
  Send,
  X,
  CheckCircle,
  XCircle,
  Loader,
} from "lucide-react-native";
import { usePhotographerAuth } from "../../hooks/usePhotographerAuth";
import { useSubscriptionStatus } from "../../hooks/useSubscriptionStatus";
import SubscriptionRequiredOverlay from "../../components/SubscriptionRequiredOverlay";

interface PhotographerEventScreenProps {
  navigation: any;
}

const PhotographerEventScreen: React.FC<PhotographerEventScreenProps> = ({
  navigation,
}) => {
  const { photographerId } = usePhotographerAuth(); // Lấy photographerId từ context hoặc storage
  const [activeTab, setActiveTab] = useState<"discover" | "applications">(
    "discover"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LocationEvent | null>(
    null
  );
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationRate, setApplicationRate] = useState("");
  const { hasActiveSubscription, isLoading: subscriptionLoading } =
    useSubscriptionStatus(photographerId);

  // Hooks
  const {
    activeEvents,
    upcomingEvents,
    featuredEvents,
    loading: discoveryLoading,
    error: discoveryError,
    refetch: refetchDiscovery,
  } = useEventDiscovery();

  const {
    events: searchResults,
    loading: searchLoading,
    searchEvents,
  } = useEventSearch();

  const {
    applications,
    loading: applicationsLoading,
    error: applicationsError,
    refetch: refetchApplications,
  } = usePhotographerApplications(photographerId);

  const {
    applyToEvent,
    withdrawApplication,
    checkApplicationEligibility,
    getApplicationStatus,
    loading: actionLoading,
    error: actionError,
  } = useApplicationActions();

  const {
    event: eventDetail,
    loading: detailLoading,
    refetch: refetchEventDetail,
  } = useEventDetail(selectedEvent?.eventId || null);

  const {
    photographers: approvedPhotographers,
    loading: photographersLoading,
  } = useApprovedPhotographers(selectedEvent?.eventId || null);

  // Effects
  useEffect(() => {
    if (searchQuery.trim()) {
      const delayedSearch = setTimeout(() => {
        searchEvents(searchQuery);
      }, 500);
      return () => clearTimeout(delayedSearch);
    }
  }, [searchQuery, searchEvents]);

  // Handle keyboard dismiss when modal closes
  useEffect(() => {
    if (!showApplicationModal) {
      Keyboard.dismiss();
      setApplicationRate(""); // Clear rate when modal closes
    }
  }, [showApplicationModal]);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === "discover") {
        await refetchDiscovery();
      } else {
        await refetchApplications();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleEventPress = (event: LocationEvent) => {
    setSelectedEvent(event);
  };

  const handleApplyPress = async (event: LocationEvent) => {
    const canApply = await checkApplicationEligibility(
      event.eventId,
      photographerId ?? 0
    );

    if (!canApply) {
      Alert.alert(
        "Cannot Apply",
        "You are not eligible to apply for this event or have already applied."
      );
      return;
    }

    setSelectedEvent(event);
    setShowApplicationModal(true);
  };

  const handleSubmitApplication = async () => {
    if (!selectedEvent) return;

    const success = await applyToEvent({
      eventId: selectedEvent.eventId,
      photographerId: photographerId ?? 0,
      specialRate: applicationRate ? parseFloat(applicationRate) : undefined,
    });

    if (success) {
      Alert.alert(
        "Success",
        "Your application has been submitted successfully!"
      );
      setShowApplicationModal(false);
      setApplicationRate("");
      refetchApplications();
    } else {
      Alert.alert("Error", actionError || "Failed to submit application");
    }
  };

  const handleWithdrawApplication = async (eventId: number) => {
    Alert.alert(
      "Withdraw Application",
      "Are you sure you want to withdraw your application?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: async () => {
            const success = await withdrawApplication(
              eventId,
              photographerId ?? 0
            );
            if (success) {
              Alert.alert("Success", "Application withdrawn successfully");
              refetchApplications();
            } else {
              Alert.alert(
                "Error",
                actionError || "Failed to withdraw application"
              );
            }
          },
        },
      ]
    );
  };

  const getApplicationForEvent = (
    eventId: number
  ): EventApplication | undefined => {
    return applications.find((app) => app.eventId === eventId);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price?: number) => {
    return price ? `$${price.toFixed(2)}` : "Free";
  };

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "#10B981";
      case "Active":
        return "#3B82F6";
      case "Closed":
        return "#6B7280";
      case "Cancelled":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.APPROVED:
        return "#10B981";
      case ApplicationStatus.REJECTED:
        return "#EF4444";
      case ApplicationStatus.APPLIED:
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.APPROVED:
        return <CheckCircle size={16} color="#10B981" />;
      case ApplicationStatus.REJECTED:
        return <XCircle size={16} color="#EF4444" />;
      case ApplicationStatus.APPLIED:
        return <Loader size={16} color="#F59E0B" />;
      default:
        return null;
    }
  };

  // Event Card Component
  const EventCard: React.FC<{
    event: LocationEvent;
    showApplicationStatus?: boolean;
  }> = ({ event, showApplicationStatus = false }) => {
    const application = showApplicationStatus
      ? getApplicationForEvent(event.eventId)
      : null;

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => handleEventPress(event)}
      >
        {event.primaryImage && (
          <Image
            source={{ uri: event.primaryImage.url }}
            style={styles.eventImage}
          />
        )}

        <View style={styles.eventContent}>
          <Text style={styles.eventTitle}>{event.name}</Text>

          {event.description && (
            <Text style={styles.eventDescription} numberOfLines={2}>
              {event.description}
            </Text>
          )}

          {/* Use locationName from API or location object */}
          {(event.locationName || event.location?.name) && (
            <View style={styles.eventInfo}>
              <MapPin size={14} color="#6B7280" />
              <Text style={styles.eventInfoText}>
                {event.locationName || event.location?.name}
              </Text>
            </View>
          )}

          {/* Use locationAddress from API */}
          {event.locationAddress && (
            <View style={styles.eventInfo}>
              <MapPin size={14} color="#6B7280" />
              <Text style={styles.eventInfoText}>{event.locationAddress}</Text>
            </View>
          )}

          <View style={styles.eventInfo}>
            <Calendar size={14} color="#6B7280" />
            <Text style={styles.eventInfoText}>
              {formatDate(event.startDate)} - {formatDate(event.endDate)}
            </Text>
          </View>

          <View style={styles.eventInfo}>
            <DollarSign size={14} color="#6B7280" />
            <Text style={styles.eventInfoText}>
              {formatPrice(event.discountedPrice)}
              {event.originalPrice &&
                event.discountedPrice !== event.originalPrice && (
                  <Text style={styles.originalPrice}>
                    {" "}
                    (was {formatPrice(event.originalPrice)})
                  </Text>
                )}
            </Text>
          </View>

          {event.maxPhotographers && (
            <View style={styles.eventInfo}>
              <Users size={14} color="#6B7280" />
              <Text style={styles.eventInfoText}>
                {event.approvedPhotographersCount || 0}/{event.maxPhotographers}{" "}
                photographers
              </Text>
            </View>
          )}

          {/* Status badge for event status */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getEventStatusColor(event.status) + "20" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getEventStatusColor(event.status) },
              ]}
            >
              {event.status}
            </Text>
          </View>

          {showApplicationStatus && application && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(application.status) + "20" },
              ]}
            >
              {getStatusIcon(application.status)}
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(application.status) },
                ]}
              >
                {application.status}
              </Text>
            </View>
          )}

          {!showApplicationStatus && event.status === "Open" && (
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => handleApplyPress(event)}
            >
              <Send size={14} color="#FFFFFF" />
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render Methods
  const renderDiscoveryTab = () => {
    console.log("Rendering discovery tab:");
    console.log("Featured events:", featuredEvents);
    console.log("Active events:", activeEvents);
    console.log("Upcoming events:", upcomingEvents);
    console.log("Discovery loading:", discoveryLoading);
    console.log("Discovery error:", discoveryError);

    return (
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {discoveryLoading && (
            <Text style={styles.loadingText}>Loading events...</Text>
          )}

          {discoveryError && (
            <Text style={styles.errorText}>Error: {discoveryError}</Text>
          )}

          {searchQuery.trim() ? (
            <View>
              <Text style={styles.sectionTitle}>Search Results</Text>
              {searchLoading ? (
                <Text style={styles.loadingText}>Searching...</Text>
              ) : searchResults.length === 0 ? (
                <Text style={styles.emptyText}>No search results found</Text>
              ) : (
                searchResults.map((event) => (
                  <EventCard key={event.eventId} event={event} />
                ))
              )}
            </View>
          ) : (
            <>
              {featuredEvents.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Featured Events ({featuredEvents.length})
                  </Text>
                  {featuredEvents.map((event) => (
                    <EventCard key={event.eventId} event={event} />
                  ))}
                </View>
              )}

              {activeEvents.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Active Events ({activeEvents.length})
                  </Text>
                  {activeEvents.map((event) => (
                    <EventCard key={event.eventId} event={event} />
                  ))}
                </View>
              )}

              {upcomingEvents.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Upcoming Events ({upcomingEvents.length})
                  </Text>
                  {upcomingEvents.map((event) => (
                    <EventCard key={event.eventId} event={event} />
                  ))}
                </View>
              )}

              {!discoveryLoading &&
                featuredEvents.length === 0 &&
                activeEvents.length === 0 &&
                upcomingEvents.length === 0 && (
                  <Text style={styles.emptyText}>No events available</Text>
                )}
            </>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderApplicationsTab = () => {
    console.log("Rendering applications tab:");
    console.log("Applications:", applications);
    console.log("Applications loading:", applicationsLoading);
    console.log("Applications error:", applicationsError);
    console.log("PhotographerId:", photographerId);

    return (
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>My Applications</Text>

        {applicationsLoading ? (
          <Text style={styles.loadingText}>Loading applications...</Text>
        ) : applicationsError ? (
          <Text style={styles.errorText}>Error: {applicationsError}</Text>
        ) : applications.length === 0 ? (
          <Text style={styles.emptyText}>No applications yet</Text>
        ) : (
          applications.map((application) => {
            const eventFromApplication: LocationEvent = {
              eventId: application.eventId,
              locationId: 0, // Default value since not provided
              name: application.eventName ?? "",
              description: undefined,
              startDate: application.eventStartDate ?? "",
              endDate: application.eventEndDate ?? "",
              discountedPrice: application.specialRate,
              originalPrice: undefined,
              status: application.eventStatus as EventStatus,
              approvedPhotographersCount: 0,
              totalBookingsCount: 0,
              createdAt: application.appliedAt,
              updatedAt: application.appliedAt,
            };

            return (
              <View
                key={application.eventPhotographerId || application.eventId}
                style={styles.applicationCard}
              >
                <EventCard event={eventFromApplication} showApplicationStatus />

                {/* Application specific info */}
                <View style={styles.applicationInfo}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          getStatusColor(application.status) + "20",
                      },
                    ]}
                  >
                    {getStatusIcon(application.status)}
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(application.status) },
                      ]}
                    >
                      {application.status}
                    </Text>
                  </View>

                  <Text style={styles.applicationDate}>
                    Applied: {formatDate(application.appliedAt)}
                  </Text>

                  {application.approvedAt && (
                    <Text style={styles.applicationDate}>
                      Approved: {formatDate(application.approvedAt)}
                    </Text>
                  )}

                  {application.specialRate && application.specialRate > 0 && (
                    <Text style={styles.specialRate}>
                      Special Rate: {formatPrice(application.specialRate)}
                    </Text>
                  )}
                </View>

                {application.status === ApplicationStatus.APPLIED && (
                  <TouchableOpacity
                    style={styles.withdrawButton}
                    onPress={() =>
                      handleWithdrawApplication(application.eventId)
                    }
                  >
                    <Text style={styles.withdrawButtonText}>Withdraw</Text>
                  </TouchableOpacity>
                )}

                {application.rejectionReason && (
                  <Text style={styles.rejectionReason}>
                    Reason: {application.rejectionReason}
                  </Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Events</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "discover" && styles.activeTab]}
          onPress={() => setActiveTab("discover")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "discover" && styles.activeTabText,
            ]}
          >
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "applications" && styles.activeTab]}
          onPress={() => setActiveTab("applications")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "applications" && styles.activeTabText,
            ]}
          >
            My Applications
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === "discover"
        ? renderDiscoveryTab()
        : renderApplicationsTab()}

      {/* Application Modal */}
      <Modal
        visible={showApplicationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowApplicationModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Apply to Event</Text>
                    <TouchableOpacity
                      onPress={() => setShowApplicationModal(false)}
                    >
                      <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  {selectedEvent && (
                    <ScrollView
                      style={styles.modalScrollView}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                    >
                      <View style={styles.modalBody}>
                        <Text style={styles.eventName}>
                          {selectedEvent.name}
                        </Text>

                        <View style={styles.inputContainer}>
                          <Text style={styles.inputLabel}>
                            Special Rate (Optional)
                          </Text>
                          <TextInput
                            style={styles.input}
                            placeholder="Enter your special rate for this event"
                            value={applicationRate}
                            onChangeText={setApplicationRate}
                            keyboardType="numeric"
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                            blurOnSubmit={true}
                          />
                          <Text style={styles.inputHint}>
                            Leave empty to use event's default rate:{" "}
                            {formatPrice(selectedEvent.discountedPrice)}
                          </Text>
                        </View>

                        <View style={styles.modalActions}>
                          <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                              Keyboard.dismiss();
                              setShowApplicationModal(false);
                            }}
                          >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.submitButton,
                              actionLoading && styles.disabledButton,
                            ]}
                            onPress={() => {
                              Keyboard.dismiss();
                              handleSubmitApplication();
                            }}
                            disabled={actionLoading}
                          >
                            {actionLoading ? (
                              <Loader size={16} color="#FFFFFF" />
                            ) : (
                              <Send size={16} color="#FFFFFF" />
                            )}
                            <Text style={styles.submitButtonText}>
                              {actionLoading
                                ? "Submitting..."
                                : "Submit Application"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </ScrollView>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
      <SubscriptionRequiredOverlay
        isVisible={!hasActiveSubscription && !subscriptionLoading}
        onNavigateToSubscription={() =>
          navigation.navigate("SubscriptionManagement")
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#3B82F6",
  },
  tabText: {
    fontSize: 16,
    color: "#6B7280",
  },
  activeTabText: {
    color: "#3B82F6",
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#111827",
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  eventContent: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
    lineHeight: 20,
  },
  eventInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  eventInfoText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 6,
  },
  originalPrice: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  applicationCard: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  applicationInfo: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  applicationDate: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  specialRate: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "600",
    marginTop: 4,
  },
  withdrawButton: {
    backgroundColor: "#EF4444",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  withdrawButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  rejectionReason: {
    fontSize: 12,
    color: "#EF4444",
    marginHorizontal: 16,
    marginBottom: 12,
    fontStyle: "italic",
  },
  loadingText: {
    textAlign: "center",
    color: "#6B7280",
    marginVertical: 20,
  },
  emptyText: {
    textAlign: "center",
    color: "#6B7280",
    marginVertical: 20,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    minHeight: "50%",
  },
  modalScrollView: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  modalBody: {
    padding: 16,
    paddingBottom: 40,
  },
  eventName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  inputHint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#3B82F6",
  },
  submitButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
  },
});

export default PhotographerEventScreen;
