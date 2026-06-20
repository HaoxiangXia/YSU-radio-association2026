import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/departments',
      name: 'departments',
      component: () => import('@/views/DepartmentsView.vue'),
    },
    {
      path: '/activities',
      name: 'activities',
      component: () => import('@/views/ActivitiesView.vue'),
    },
    {
      path: '/activities/competition',
      name: 'competition-activities',
      component: () => import('@/views/CompetitionActivitiesView.vue'),
    },
    {
      path: '/activities/recreational',
      name: 'recreational-activities',
      component: () => import('@/views/RecreationalActivitiesView.vue'),
    },
    {
      path: '/honors',
      name: 'honors',
      component: () => import('@/views/HonorsView.vue'),
    },
    {
      path: '/trainings',
      name: 'trainings',
      component: () => import('@/views/TrainingsView.vue'),
    },
    {
      path: '/registration',
      name: 'registration',
      component: () => import('@/views/RegistrationView.vue'),
    },
    {
      path: '/admission',
      name: 'admission',
      component: () => import('@/views/AdmissionView.vue'),
    },
    {
      path: '/admin-login',
      name: 'admin-login',
      component: () => import('@/views/AdminLoginView.vue'),
    },
    {
      path: '/registration-info',
      name: 'registration-info',
      component: () => import('@/views/RegistrationInfoView.vue'),
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
