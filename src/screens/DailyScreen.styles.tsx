import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  title: {
    fontSize: 30,
    marginTop: -10,
    fontWeight: 'bold',
    color: '#ffffff',
    marginInlineEnd: 20,
  },
  agendaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 233, 241, 1)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: -30,
  },
  agendaButtonText: {
    color: '#ffffff',
    marginLeft: 5,
    fontWeight: '600',
  },
    backButton: {
    position: 'absolute',
    top: 580,
    left: 40,
    zIndex: 10,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 244, 6, 0.89)',
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 10,
    marginLeft: 30,
    marginRight: 30,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholder: {
    flex: 1,
    color: '#aaaaaa',
    fontSize: 16,
  },
  filterContainer: {
    marginBottom: 40,
    maxHeight: 50,
    paddingBottom: 10,
  },
  filterButton: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 8,
  paddingHorizontal: 15,
  borderRadius: 10,
  marginRight: 10,
  borderWidth: 2,
  borderColor: 'transparent',
  transform: [{ translateY: 0 }], // Estado normal
},
filterButtonActive: {
  borderWidth: 2,
  borderColor: '#ffffffff',
  transform: [{ translateY: 8 }], // ✅ "Baja" el botón 3px
},
  filterText: {
    marginLeft: 5,
    color: '#f9f3f3ff',
    fontSize: 14,
    fontWeight: '600',
  },
  calendarContainer: {
    backgroundColor: 'rgba(15, 14, 14, 0.14)',
    marginTop: -10,
    borderRadius: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  addButton: {
    position: 'absolute',
    top: 580,
    right: 50,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4bec3cf6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#210af4fb',
    borderRadius: 12,
    maxHeight: '95%',
    paddingVertical: 20,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    padding: 5,
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 15,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 5,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    marginVertical: 1,
    marginBottom: -5,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    marginBottom: 20,
    // Estilo base con elevación/sombra
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  typeOptionSelected: {
    transform: [{ translateY: 20 }],
    elevation: 1,
    shadowOffset: { width: 0, height: 0.5 },
  },
  typeOptionText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 15,
  },
  timeButtonText: {
    marginLeft: 10,
    color: '#ffffff',
    fontSize: 16,
  },
  modalFooter: {
    marginTop: 20,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#76fd09ff',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default styles;