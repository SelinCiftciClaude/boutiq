import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  Dimensions,
  FlatList,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { MOCK_NOTIFICATIONS } from '../../constants/MockData';
import { Badge } from '../../components/ui/Badge';
import { AddBrandSheet } from '../../components/AddBrandSheet';
import { Brand, BrandCategory } from '../../types';
import { Fonts } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import { useInterests } from '@/context/InterestsContext';
import { useSavedBrands } from '@/hooks/useSavedBrands';
import { useDashboard } from '@/hooks/useDashboard';
import { useProfile } from '@/hooks/useProfile';
import { useReferral } from '@/hooks/useReferral';
import { supabase } from '@/services/supabase';

type SavedBrand = { brand: Brand; userCategory: BrandCategory };

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

const CATEGORY_LABELS: Record<string, string> = {
  giyim: '👗 Giyim',
  ayakkabı: '👠 Ayakkabı',
  aksesuar: '🕶️ Aksesuar',
  çanta: '👜 Çanta',
  takı: '💍 Takı',
  güzellik: '✨ Güzellik',
  ev: '🏠 Ev',
  spor: '⚽ Spor',
  vintage: '🎞️ Vintage',
  tasarımcı: '🎨 Tasarımcı',
};

function BrandMiniCard({
  saved,
  onPress,
}: {
  saved: SavedBrand;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={miniStyles.card} activeOpacity={0.82}>
      <Image
        source={{ uri: saved.brand.coverImage }}
        style={miniStyles.cover}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(7,7,15,0.88)']}
        style={miniStyles.gradient}
      />
      <View style={miniStyles.content}>
        <Image source={{ uri: saved.brand.logo }} style={miniStyles.logo} />
        <Text style={miniStyles.name} numberOfLines={1}>
          {saved.brand.name}
        </Text>
        {saved.brand.isVerified && (
          <Ionicons name="checkmark-circle" size={11} color={Colors.gold3} />
        )}
      </View>
      {/* Edit icon */}
      <View style={miniStyles.editDot}>
        <Ionicons name="pencil" size={9} color={Colors.text3} />
      </View>
    </TouchableOpacity>
  );
}

const miniStyles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: 140,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border1,
    marginBottom: 10,
  },
  cover: { width: '100%', height: '100%', backgroundColor: Colors.surface3 },
  gradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%',
  },
  content: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 10, flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  logo: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: Colors.border2,
    backgroundColor: Colors.surface3,
  },
  name: {
    fontSize: 12, fontWeight: '700',
    color: Colors.text1, letterSpacing: -0.2, flex: 1,
  },
  editDot: {
    position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(7,7,15,0.65)',
    borderWidth: 1, borderColor: Colors.border2,
    alignItems: 'center', justifyContent: 'center',
  },
});

interface SettingRowProps {
  icon: string;
  iconColor?: string;
  iconBg?: string;
  label: string;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  danger?: boolean;
  badge?: string;
}

function SettingRow({
  icon, iconColor = Colors.text2, iconBg = Colors.surface3,
  label, value, toggle, toggleValue, onToggle, onPress, danger, badge,
}: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={toggle}
      activeOpacity={toggle ? 1 : 0.75}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <Text style={[styles.settingLabel, danger && { color: Colors.error }]} numberOfLines={1}>
        {label}
      </Text>
      {badge && <Badge label={badge} variant="gold" size="sm" />}
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {toggle ? (
          <Switch
            value={toggleValue}
            onValueChange={(v) => { Haptics.selectionAsync(); onToggle?.(v); }}
            thumbColor={toggleValue ? Colors.gold3 : Colors.text4}
            trackColor={{ false: Colors.surface4, true: Colors.goldGlow }}
          />
        ) : (
          <Ionicons name="chevron-forward" size={16} color={Colors.text5} />
        )}
      </View>
    </TouchableOpacity>
  );
}

type Tab = 'collection' | 'settings';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('collection');
  const [notifCampaign, setNotifCampaign] = useState(true);
  const [notifShipping, setNotifShipping] = useState(true);
  const [notifNewArrivals, setNotifNewArrivals] = useState(false);
  const [notifPriceDrops, setNotifPriceDrops] = useState(true);
  const [newsletter, setNewsletter] = useState(false);
  const [editSheet, setEditSheet] = useState<SavedBrand | null>(null);

  const { user: authUser, signOut } = useAuth();
  const { clearInterests } = useInterests();
  const { data: savedBrandsList = [], add: addSaved, remove: removeSaved } = useSavedBrands();
  const { data: dashboard } = useDashboard();
  const { data: profile, updateNotifications } = useProfile();
  const referral = useReferral();

  // Profil yüklenince tercihleri uygula (DB snake_case veya TS camelCase olabilir)
  React.useEffect(() => {
    const n = profile?.preferences?.notifications as any;
    if (!n) return;
    if (typeof n.campaigns === 'boolean') setNotifCampaign(n.campaigns);
    if (typeof n.shipping === 'boolean') setNotifShipping(n.shipping);
    const newArrivals = n.newArrivals ?? n.new_arrivals;
    const priceDrops = n.priceDrops ?? n.price_drops;
    if (typeof newArrivals === 'boolean') setNotifNewArrivals(newArrivals);
    if (typeof priceDrops === 'boolean') setNotifPriceDrops(priceDrops);
  }, [profile?.id]);

  // Newsletter tercihini DB'den oku
  React.useEffect(() => {
    if ((profile as any)?.newsletter_subscribed !== undefined) {
      setNewsletter(!!(profile as any).newsletter_subscribed);
    }
  }, [profile?.id]);

  const handleNewsletterToggle = async (val: boolean) => {
    Haptics.selectionAsync();
    setNewsletter(val);
    if (!authUser?.id) return;
    await supabase.from('profiles').update({ newsletter_subscribed: val }).eq('id', authUser.id);
  };

  const handleShareReferral = async () => {
    if (!referral.data) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Share.share({
      message: 'BUTİKA uygulamasını dene! Davet kodum: ' + referral.data + ' — butika://referral/' + referral.data,
    });
  };

  const userName: string =
    (authUser?.user_metadata?.name as string | undefined) ??
    authUser?.email?.split('@')[0] ??
    'Kullanıcı';
  const userEmail: string = authUser?.email ?? '';
  const userAvatar: string | null =
    (authUser?.user_metadata?.avatar_url as string | undefined) ?? null;
  const user = { name: userName, email: userEmail, avatar: userAvatar };

  const savedBrands: SavedBrand[] = savedBrandsList.map((b) => ({
    brand: b,
    userCategory: b.category,
  }));
  const categoryGroups = (() => {
    const map = new Map<BrandCategory, SavedBrand[]>();
    savedBrands.forEach((s) => {
      const list = map.get(s.userCategory) ?? [];
      list.push(s);
      map.set(s.userCategory, list);
    });
    return Array.from(map.entries()).map(([category, brands]) => ({ category, brands }));
  })();

  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length;
  const initials = userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const handleShareCollection = async () => {
    if (!authUser?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Share.share({ message: 'butika://collection/' + authUser.id });
  };

  const handleViewProfile = () => {
    if (!authUser?.id) return;
    router.push(('/collection/' + authUser.id) as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bgGlow} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profil</Text>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <LinearGradient colors={[Colors.surface2, Colors.surface3]} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={[Colors.gold2, Colors.gold4, 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.profileCardAccent}
          />
          <View style={styles.profileTop}>
            <View style={styles.avatarContainer}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <LinearGradient colors={[Colors.gold2, Colors.gold4]} style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </LinearGradient>
              )}
              <TouchableOpacity style={styles.avatarEdit}>
                <Ionicons name="camera" size={12} color={Colors.bg} />
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{dashboard?.savedBrands ?? savedBrands.length}</Text>
              <Text style={styles.statLabel}>Butik</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{dashboard?.savedProducts ?? 0}</Text>
              <Text style={styles.statLabel}>Ürün</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{dashboard?.activeShipments ?? 0}</Text>
              <Text style={styles.statLabel}>Sipariş</Text>
            </View>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={handleViewProfile}>
              <Ionicons name="eye-outline" size={20} color={Colors.gold3} />
              <Text style={styles.statLabel}>Profilim</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* Tab switcher */}
        <View style={styles.tabRow}>
          {(['collection', 'settings'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => { Haptics.selectionAsync(); setActiveTab(tab); }}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              {activeTab === tab && (
                <LinearGradient
                  colors={[Colors.gold2, Colors.gold4]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Ionicons
                name={tab === 'collection' ? 'grid' : 'settings-outline'}
                size={14}
                color={activeTab === tab ? Colors.bg : Colors.text3}
              />
              <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                {tab === 'collection' ? 'Koleksiyonum' : 'Ayarlar'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── COLLECTION TAB ── */}
        {activeTab === 'collection' && (
          <>
            {savedBrands.length === 0 ? (
              <View style={styles.emptyCollection}>
                <Text style={styles.emptyIcon}>📌</Text>
                <Text style={styles.emptyTitle}>Henüz butik eklemedin</Text>
                <Text style={styles.emptySubtitle}>
                  Butikler sekmesinden beğendiğin markaları koleksiyonuna ekle.
                </Text>
              </View>
            ) : (
              categoryGroups.map(({ category, brands }) => (
                <View key={category} style={styles.categorySection}>
                  {/* Kategori başlığı */}
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryStripe} />
                    <Text style={styles.categoryTitle}>
                      {CATEGORY_LABELS[category] ?? category}
                    </Text>
                    <Text style={styles.categoryCount}>{brands.length}</Text>
                  </View>

                  {/* Yatay kayan marka kartları */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.brandScroll}
                  >
                    {brands.map((s) => (
                      <TouchableOpacity
                        key={s.brand.id}
                        style={styles.brandCard}
                        onPress={() => router.push(`/brand/${s.brand.id}` as any)}
                        onLongPress={() => setEditSheet(s)}
                        activeOpacity={0.85}
                      >
                        <Image
                          source={{ uri: s.brand.coverImage }}
                          style={styles.brandCardCover}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={['transparent', 'rgba(28,14,8,0.82)']}
                          style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.brandCardInfo}>
                          <Image source={{ uri: s.brand.logo }} style={styles.brandCardLogo} />
                          <Text style={styles.brandCardName} numberOfLines={1}>{s.brand.name}</Text>
                        </View>
                        {s.brand.isVerified && (
                          <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark" size={8} color="#fff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ))
            )}
          </>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === 'settings' && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Bildirimler</Text>
                {unreadCount > 0 && <Badge label={`${unreadCount} okunmamış`} variant="gold" size="sm" />}
              </View>
              <View style={styles.settingsGroup}>
                <SettingRow icon="megaphone" iconColor={Colors.gold3} iconBg={Colors.glassGold} label="Kampanyalar" toggle toggleValue={notifCampaign} onToggle={(v) => { setNotifCampaign(v); updateNotifications.mutate({ campaigns: v, shipping: notifShipping, newArrivals: notifNewArrivals, priceDrops: notifPriceDrops }); }} />
                <SettingRow icon="bicycle" iconColor={Colors.success} iconBg={Colors.successGlow} label="Kargo Güncellemeleri" toggle toggleValue={notifShipping} onToggle={(v) => { setNotifShipping(v); updateNotifications.mutate({ campaigns: notifCampaign, shipping: v, newArrivals: notifNewArrivals, priceDrops: notifPriceDrops }); }} />
                <SettingRow icon="sparkles" iconColor={Colors.purple3} iconBg={Colors.purpleGlow} label="Yeni Ürünler" toggle toggleValue={notifNewArrivals} onToggle={(v) => { setNotifNewArrivals(v); updateNotifications.mutate({ campaigns: notifCampaign, shipping: notifShipping, newArrivals: v, priceDrops: notifPriceDrops }); }} />
                <SettingRow icon="trending-down" iconColor={Colors.rose3} iconBg={Colors.roseGlow} label="Fiyat Düşüşleri" toggle toggleValue={notifPriceDrops} onToggle={(v) => { setNotifPriceDrops(v); updateNotifications.mutate({ campaigns: notifCampaign, shipping: notifShipping, newArrivals: notifNewArrivals, priceDrops: v }); }} />
                <SettingRow icon="mail" iconColor={Colors.info} iconBg="rgba(59,130,246,0.15)" label="Haftalık Bülten" toggle toggleValue={newsletter} onToggle={handleNewsletterToggle} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bağlı Hesaplar</Text>
              <View style={styles.settingsGroup}>
                <SettingRow icon="logo-instagram" iconColor="#E1306C" iconBg="rgba(225,48,108,0.15)" label="Instagram" value="Bağlı değil" onPress={() => {}} />
                <SettingRow icon="mail" iconColor={Colors.info} iconBg="rgba(59,130,246,0.15)" label="E-posta" value={(profile?.connectedAccounts as any)?.gmail?.connected ? 'Bağlı ✓' : 'Bağlı değil'} badge={(profile?.connectedAccounts as any)?.gmail?.connected ? undefined : 'Yeni'} onPress={() => router.push('/connect-mail' as any)} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sosyal</Text>
              <View style={styles.settingsGroup}>
                <SettingRow icon="eye-outline" iconColor={Colors.gold3} iconBg={Colors.glassGold} label="Koleksiyonumu Görüntüle" onPress={handleViewProfile} />
                <SettingRow icon="share-social-outline" iconColor={Colors.teal2} iconBg={Colors.tealGlow} label="Koleksiyonumu Paylaş" onPress={handleShareCollection} />
                <SettingRow icon="gift-outline" iconColor={Colors.gold3} iconBg={Colors.glassGold} label="Arkadaşını Davet Et" onPress={handleShareReferral} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Uygulama</Text>
              <View style={styles.settingsGroup}>
                <SettingRow icon="shield-checkmark" iconColor={Colors.success} iconBg={Colors.successGlow} label="Gizlilik & KVKK" onPress={() => {}} />
                <SettingRow icon="document-text" iconColor={Colors.text3} iconBg={Colors.surface3} label="Kullanım Şartları" onPress={() => {}} />
                <SettingRow icon="information-circle" iconColor={Colors.text3} iconBg={Colors.surface3} label="Versiyon" value="1.0.0" />
                <SettingRow icon="refresh" iconColor={Colors.gold3} iconBg={Colors.glassGold} label="Tanıtım Ekranını Sıfırla" onPress={clearInterests} />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.settingsGroup}>
                <SettingRow icon="log-out" iconColor={Colors.error} iconBg="rgba(239,68,68,0.15)" label="Çıkış Yap" danger onPress={handleSignOut} />
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>✦ BUTİKA — bağımsız modanın evi</Text>
              <Text style={styles.footerSub}>Butik yönlendirmelerinden affiliate komisyonu kazanılmaktadır.</Text>
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit sheet for existing saved brand */}
      <AddBrandSheet
        brand={editSheet?.brand ?? null}
        visible={!!editSheet}
        alreadySaved
        currentCategory={editSheet?.userCategory}
        onSave={(brand) => addSaved.mutate({ brandId: brand.id, isFavorite: true })}
        onRemove={(id) => removeSaved.mutate(id)}
        onClose={() => setEditSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  bgGlow: {
    position: 'absolute', top: 0, right: -100,
    width: 350, height: 350, borderRadius: 175,
    backgroundColor: Colors.purpleGlow, opacity: 0.3,
  },
  scroll: { paddingHorizontal: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: 12, paddingBottom: 16,
  },
  headerTitle: { fontFamily: Fonts.editorial, fontSize: 34, color: Colors.text1, letterSpacing: 0 },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border2,
  },
  profileCard: {
    borderRadius: 16, padding: 20, borderWidth: 0.5,
    borderColor: Colors.border2, overflow: 'hidden',
    position: 'relative', marginBottom: 16, gap: 16,
  },
  profileCardAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 },
  profileTop: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  avatarContainer: { position: 'relative' },
  avatar: { width: 66, height: 66, borderRadius: 33 },
  avatarPlaceholder: {
    width: 66, height: 66, borderRadius: 33,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontFamily: Fonts.editorial, fontSize: 26, color: Colors.bg },
  avatarEdit: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.gold3, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.surface2,
  },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontFamily: Fonts.uiMedium, fontSize: 18, color: Colors.text1, letterSpacing: -0.3 },
  profileEmail: { fontFamily: Fonts.uiLight, fontSize: 12, color: Colors.text4, marginBottom: 4 },
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface3,
    borderRadius: 12, padding: 14,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: { fontFamily: Fonts.ui, fontSize: 20, color: Colors.text1, letterSpacing: -0.5 },
  statLabel: { fontFamily: Fonts.uiMedium, fontSize: 9, color: Colors.text4, textTransform: 'uppercase', letterSpacing: 1 },
  statDivider: { width: 0.5, height: 28, backgroundColor: Colors.border2 },
  // Tabs
  tabRow: {
    flexDirection: 'row', gap: 8, marginBottom: 20,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 12, borderRadius: 10,
    backgroundColor: Colors.surface2, borderWidth: 0.5, borderColor: Colors.border2,
    overflow: 'hidden',
  },
  tabActive: { borderColor: Colors.gold3 },
  tabLabel: { fontFamily: Fonts.uiMedium, fontSize: 11, color: Colors.text3, letterSpacing: 0.5, textTransform: 'uppercase' },
  tabLabelActive: { color: Colors.bg },

  // Collection
  emptyCollection: {
    alignItems: 'center', paddingTop: 48, paddingHorizontal: 32, gap: 10,
  },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontFamily: Fonts.editorial, fontSize: 24, color: Colors.text2, textAlign: 'center' },
  emptySubtitle: { fontFamily: Fonts.uiLight, fontSize: 14, color: Colors.text4, textAlign: 'center', lineHeight: 21 },

  categorySection: { marginBottom: 24 },
  categoryHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 10, paddingHorizontal: 4,
  },
  categoryStripe: {
    width: 3, height: 18, borderRadius: 2,
    backgroundColor: Colors.rose3,
  },
  categoryTitle: {
    fontFamily: Fonts.editorial, fontSize: 22, color: Colors.text1, flex: 1,
  },
  categoryCount: {
    fontFamily: Fonts.uiMedium, fontSize: 11,
    color: Colors.text4, letterSpacing: 0.5,
  },

  // Yatay butik kartları
  brandScroll: { gap: 10, paddingHorizontal: 4 },
  brandCard: {
    width: 130, height: 170,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 0.5, borderColor: Colors.border2,
    position: 'relative',
  },
  brandCardCover: {
    width: '100%', height: '100%',
    backgroundColor: Colors.surface3,
  },
  brandCardInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 10, gap: 4,
  },
  brandCardLogo: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1.5, borderColor: Colors.borderGold,
    backgroundColor: Colors.surface3,
  },
  brandCardName: {
    fontFamily: Fonts.uiMedium, fontSize: 12,
    color: '#fff', letterSpacing: -0.1,
  },
  verifiedBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.gold3,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#fff',
  },
  masonryRow: { flexDirection: 'row', gap: 10 },
  masonryCol: { flex: 1 },
  masonryColOffset: { marginTop: 30 },

  // Settings
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.uiMedium, fontSize: 9, color: Colors.text4,
    letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 12, flex: 1,
  },
  settingsGroup: {
    backgroundColor: Colors.surface2, borderRadius: 14,
    borderWidth: 0.5, borderColor: Colors.border1, overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: Colors.border1,
  },
  settingIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { flex: 1, fontFamily: Fonts.uiLight, fontSize: 15, color: Colors.text1, letterSpacing: -0.1 },
  settingValue: { fontFamily: Fonts.uiLight, fontSize: 12, color: Colors.text4 },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footer: { alignItems: 'center', gap: 6, paddingVertical: 16 },
  footerText: { fontFamily: Fonts.uiMedium, fontSize: 10, color: Colors.gold3, letterSpacing: 2, textTransform: 'uppercase' },
  footerSub: { fontFamily: Fonts.uiLight, fontSize: 10, color: Colors.text5, textAlign: 'center', lineHeight: 16 },
});
