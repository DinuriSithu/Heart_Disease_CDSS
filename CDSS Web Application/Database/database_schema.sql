--
-- PostgreSQL database dump
--

\restrict q0qs5nWTGeYYzdLNLcSI3JibTwzI6aSpD0CV0b8Qt00oRrvpGNd7skoFI9ycItc

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

-- Started on 2026-11-26 06:45:38

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 224 (class 1259 OID 16464)
-- Name: patient_assessments; Type: TABLE; Schema: public; Owner: cdss_app
--

CREATE TABLE public.patient_assessments (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    patient_reference character varying(100) NOT NULL,
    patient_data jsonb NOT NULL,
    predicted_class integer NOT NULL,
    probability_class_0 double precision NOT NULL,
    probability_class_1 double precision NOT NULL,
    shap_explanations jsonb NOT NULL,
    medical_evidence jsonb,
    created_at timestamp with time zone NOT NULL,
    patient_id integer,
    CONSTRAINT ck_assessment_predicted_class CHECK ((predicted_class = ANY (ARRAY[0, 1]))),
    CONSTRAINT ck_assessment_probability_0 CHECK (((probability_class_0 >= (0)::double precision) AND (probability_class_0 <= (1)::double precision))),
    CONSTRAINT ck_assessment_probability_1 CHECK (((probability_class_1 >= (0)::double precision) AND (probability_class_1 <= (1)::double precision)))
);


ALTER TABLE public.patient_assessments OWNER TO cdss_app;

--
-- TOC entry 223 (class 1259 OID 16463)
-- Name: patient_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: cdss_app
--

CREATE SEQUENCE public.patient_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patient_assessments_id_seq OWNER TO cdss_app;

--
-- TOC entry 4955 (class 0 OID 0)
-- Dependencies: 223
-- Name: patient_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cdss_app
--

ALTER SEQUENCE public.patient_assessments_id_seq OWNED BY public.patient_assessments.id;


--
-- TOC entry 226 (class 1259 OID 16493)
-- Name: patients; Type: TABLE; Schema: public; Owner: cdss_app
--

CREATE TABLE public.patients (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    patient_reference character varying(100) NOT NULL,
    full_name character varying(150) NOT NULL,
    date_of_birth timestamp with time zone,
    sex character varying(1),
    medical_history text,
    family_history text,
    medications text,
    allergies text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.patients OWNER TO cdss_app;

--
-- TOC entry 225 (class 1259 OID 16492)
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: cdss_app
--

CREATE SEQUENCE public.patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patients_id_seq OWNER TO cdss_app;

--
-- TOC entry 4956 (class 0 OID 0)
-- Dependencies: 225
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cdss_app
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;


--
-- TOC entry 222 (class 1259 OID 16446)
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: cdss_app
--

CREATE TABLE public.user_sessions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


ALTER TABLE public.user_sessions OWNER TO cdss_app;

--
-- TOC entry 221 (class 1259 OID 16445)
-- Name: user_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: cdss_app
--

CREATE SEQUENCE public.user_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_sessions_id_seq OWNER TO cdss_app;

--
-- TOC entry 4957 (class 0 OID 0)
-- Dependencies: 221
-- Name: user_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cdss_app
--

ALTER SEQUENCE public.user_sessions_id_seq OWNED BY public.user_sessions.id;


--
-- TOC entry 220 (class 1259 OID 16427)
-- Name: users; Type: TABLE; Schema: public; Owner: cdss_app
--

CREATE TABLE public.users (
    id integer NOT NULL,
    full_name character varying(150) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT ck_users_role CHECK (((role)::text = ANY ((ARRAY['doctor'::character varying, 'admin'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO cdss_app;

--
-- TOC entry 219 (class 1259 OID 16426)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: cdss_app
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO cdss_app;

--
-- TOC entry 4958 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cdss_app
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4772 (class 2604 OID 16467)
-- Name: patient_assessments id; Type: DEFAULT; Schema: public; Owner: cdss_app
--

ALTER TABLE ONLY public.patient_assessments ALTER COLUMN id SET DEFAULT nextval('public.patient_assessments_id_seq'::regclass);


--
-- TOC entry 4773 (class 2604 OID 16496)
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: cdss_app
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);


--
-- TOC entry 4771 (class 2604 OID 16449)
-- Name: user_sessions id; Type: DEFAULT; Schema: public; Owner: cdss_app
--

ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);


--
-- TOC entry 4770 (class 2604 OID 16430)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: cdss_app
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4791 (class 2606 OID 16483)
-- Name: patient_assessments patient_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: cdss_app
--

ALTER TABLE ONLY public.patient_assessments
    ADD CONSTRAINT patient_assessments_pkey PRIMARY KEY (id);


--
-- TOC entry 4795 (class 2606 OID 16505)
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: cdss_app
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- TOC entry 4797 (class 2606 OID 16507)
-- Name: patients uq_patient_doctor_reference; Type: CONSTRAINT; Schema: public; Owner: cdss_app
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT uq_patient_doctor_reference UNIQUE (doctor_id, patient_reference);


--
-- TOC entry 4785 (class 2606 OID 16455)
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: cdss_app
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4781 (class 2606 OID 16442)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: cdss_app
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4786 (class 1259 OID 16491)
-- Name: ix_patient_assessments_doctor_id; Type: INDEX; Schema: public; Owner: cdss_app
--

CREATE INDEX ix_patient_assessments_doctor_id ON public.patient_assessments USING btree (doctor_id);


--
-- TOC entry 4787 (class 1259 OID 16489)
-- Name: ix_patient_assessments_id; Type: INDEX; Schema: public; Owner: cdss_app
--

CREATE INDEX ix_patient_assessments_id ON public.patient_assessments USING btree (id);


--
-- TOC entry 4788 (class 1259 OID 16520)
-- Name: ix_patient_assessments_patient_id; Type: INDEX; Schema: public; Owner: cdss_app
--

CREATE INDEX ix_patient_assessments_patient_id ON public.patient_assessments USING btree (patient_id);


--
-- TOC entry 4789 (class 1259 OID 16490)
-- Name: ix_patient_assessments_patient_reference; Type: INDEX; Schema: public; Owner: cdss_app
--

CREATE INDEX ix_patient_assessments_patient_reference ON public.patient_assessments USING btree (patient_reference);


--
-- TOC entry 4792 (class 1259 OID 16514)
-- Name: ix_patients_doctor_id; Type: INDEX; Schema: public; Owner: cdss_app
--

CREATE INDEX ix_patients_doctor_id ON public.patients USING btree (doctor_id);


--
-- TOC entry 4793 (class 1259 OID 16513)
-- Name: ix_patients_id; Type: INDEX; Schema: public; Owner: cdss_app
--

CREATE INDEX ix_patients_id ON public.patients USING btree (id);


--
-- TOC entry 4782 (class 1259 OID 16462)
-- Name: ix_user_sessions_token_hash; Type: INDEX; Schema: public; Owner: cdss_app
--

CREATE UNIQUE INDEX ix_user_sessions_token_hash ON public.user_sessions USING btree (token_hash);


--
-- TOC entry 4783 (class 1259 OID 16461)
-- Name: ix_user_sessions_user_id; Type: INDEX; Schema: public; Owner: cdss_app
--

CREATE INDEX ix_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- TOC entry 4778 (class 1259 OID 16444)
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: cdss_app
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- TOC entry 4779 (class 1259 OID 16443)
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: cdss_app
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- TOC entry 4799 (class 2606 OID 16484)
-- Name: patient_assessments patient_assessments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cdss_app
--

ALTER TABLE ONLY public.patient_assessments
    ADD CONSTRAINT patient_assessments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4800 (class 2606 OID 16515)
-- Name: patient_assessments patient_assessments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cdss_app
--

ALTER TABLE ONLY public.patient_assessments
    ADD CONSTRAINT patient_assessments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT;


--
-- TOC entry 4801 (class 2606 OID 16508)
-- Name: patients patients_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cdss_app
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4798 (class 2606 OID 16456)
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cdss_app
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4954 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO cdss_app;


-- Completed on 2026-11-26 06:45:39

--
-- PostgreSQL database dump complete
--

\unrestrict q0qs5nWTGeYYzdLNLcSI3JibTwzI6aSpD0CV0b8Qt00oRrvpGNd7skoFI9ycItc

